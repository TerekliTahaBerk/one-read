import { NextResponse } from "next/server";
import { validateEvent, WebhookVerificationError } from "@polar-sh/sdk/webhooks";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { applyPolarWebhookPayload } from "@/lib/billing/polar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function headersToRecord(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  headers.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

export async function POST(request: Request) {
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

  const parsedBody = JSON.parse(body) as Prisma.InputJsonValue;
  const providerEventId =
    request.headers.get("webhook-id") ??
    `${payload.type}:${(payload as any).data?.id ?? payload.timestamp.toISOString()}`;

  try {
    await prisma.billingEvent.create({
      data: {
        provider: "polar",
        providerEventId,
        type: payload.type,
        payload: parsedBody,
      },
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    throw err;
  }

  await applyPolarWebhookPayload(payload as any);

  await prisma.billingEvent.update({
    where: { providerEventId },
    data: { processedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
