import { NextResponse } from "next/server";
import { validateEvent, WebhookVerificationError } from "@polar-sh/sdk/webhooks";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { applyPolarWebhookPayload, isSupportedPolarEventType } from "@/lib/billing/polar";
import { reportOperationalEvent } from "@/lib/observability";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Polar webhook ingestion.
 *
 * The ordering of the steps below is the whole safety argument, so it is worth
 * stating plainly:
 *
 *   1. Signature first. Nothing — not even an audit row — is written for a
 *      payload we cannot prove came from Polar. An unauthenticated caller must
 *      not be able to grow a table.
 *   2. Audit row second, before any state change. Every verified delivery is
 *      recorded, including the ones we will not act on, so an unsupported or
 *      unrecognised event is a visible NOOP rather than a silent drop.
 *   3. The unique providerEventId is the idempotency key, enforced by the
 *      database rather than by a read-then-write check.
 *   4. State change last, and only once per event.
 */

function headersToRecord(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  headers.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

/**
 * How long an unprocessed event row is assumed to belong to a delivery that is
 * still running.
 *
 * A P2002 with `processedAt: null` is ambiguous: either a previous delivery
 * crashed between recording and applying (safe to retry), or an identical
 * delivery is being processed right now in another instance (retrying would
 * apply the same event twice, and a double-apply is how a duplicate transition
 * gets settled twice). Age separates the two cases. Inside the window we
 * acknowledge without acting — Polar's retry schedule outlives it comfortably,
 * so a genuinely crashed delivery is still picked up on the next attempt.
 */
const IN_FLIGHT_WINDOW_MS = 60_000;

export async function POST(request: Request) {
  try {
    return await handlePolarWebhook(request);
  } catch (error) {
    await reportOperationalEvent("polar_webhook_failed", {
      subsystem: "polar_webhook", operation: "ingest_event", outcome: "failed", state: "unprocessed",
      retryClassification: "provider_retry", errorCode: "webhook_processing_failed",
    }, { error, level: "error", flush: true });
    throw error;
  }
}

async function handlePolarWebhook(request: Request) {
  const secret = process.env.POLAR_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ ok: false, error: "Webhook is not configured." }, { status: 503 });
  }

  const body = await request.text();
  let payload: ReturnType<typeof validateEvent>;
  try {
    payload = validateEvent(body, headersToRecord(request.headers), secret);
  } catch (err) {
    if (err instanceof WebhookVerificationError) {
      return NextResponse.json({ ok: false }, { status: 403 });
    }
    throw err;
  }

  // The signature covers the raw bytes, so this parse cannot fail for a
  // genuine Polar delivery. Guarding it anyway keeps a malformed body from
  // throwing a 500 that Polar would retry forever.
  let parsedBody: Prisma.InputJsonValue;
  try {
    parsedBody = JSON.parse(body) as Prisma.InputJsonValue;
  } catch {
    return NextResponse.json({ ok: false, error: "Malformed payload." }, { status: 400 });
  }

  const providerEventId =
    request.headers.get("webhook-id") ??
    `${payload.type}:${(payload as any).data?.id ?? String(payload.timestamp)}`;

  // Recorded before classification so an unsupported type is auditable too.
  // Unsupported events are pre-marked processed with their NOOP outcome: there
  // is no state machine step to run, and the decision is deterministic.
  const supported = isSupportedPolarEventType(payload.type);
  const now = new Date();

  try {
    await prisma.billingEvent.create({
      data: {
        provider: "polar",
        providerEventId,
        type: payload.type,
        payload: parsedBody,
        ...(supported ? {} : { processedAt: now, outcome: "ignored_event_type" }),
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const existing = await prisma.billingEvent.findUnique({
        where: { providerEventId },
        select: { processedAt: true, createdAt: true, outcome: true },
      });
      if (existing?.processedAt) {
        return NextResponse.json({ ok: true, duplicate: true, outcome: existing.outcome });
      }
      if (existing && now.getTime() - existing.createdAt.getTime() < IN_FLIGHT_WINDOW_MS) {
        // Another delivery of this same event is still being applied. Ack it;
        // the in-flight one owns the state change.
        return NextResponse.json({ ok: true, duplicate: true, inFlight: true });
      }
      // The audit row was inserted by a delivery that then failed before
      // applying it. Continue so Polar's retry can finish the event instead of
      // being acknowledged and lost forever.
    } else {
      throw err;
    }
  }

  if (!supported) {
    return NextResponse.json({ ok: true, outcome: "ignored_event_type", ignored: true });
  }

  const result = await applyPolarWebhookPayload(payload as any);

  // The outcome is recorded whether or not state changed, so an operator can
  // see that an event arrived carrying a product we do not recognise rather
  // than finding a silently ignored delivery. Marking it processed is correct
  // in every case: the event was fully handled, and the decision not to apply
  // it is deterministic — a retry would reach the same conclusion. Outcomes
  // that need a human (no_subscription, unrecognized_product) stay visible
  // through the outcome column, not by being left unprocessed.
  await prisma.billingEvent.update({
    where: { providerEventId },
    data: { processedAt: new Date(), outcome: result.outcome },
  });

  return NextResponse.json({ ok: true, outcome: result.outcome });
}
