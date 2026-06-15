import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseEmail, isAlwaysSubscribed } from "@/lib/options";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/signup/start
 * Body: { email: string }
 *
 * Idempotently registers an email and reports the subscriber's current state
 * so the client can branch:
 *   - subscribed users → manage screen (edit prefs / cancel)
 *   - everyone else    → preferences → payment
 *
 * If the subscriber already exists, the record is left alone (preferences may
 * already be saved). Always-subscribed emails are forced into a subscribed
 * state on the spot.
 */
export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request." },
      { status: 400 },
    );
  }

  const email = parseEmail((payload as { email?: unknown })?.email);
  if (!email) {
    return NextResponse.json(
      { ok: false, error: "Please enter a valid email." },
      { status: 400 },
    );
  }

  const forceSubscribed = isAlwaysSubscribed(email);

  try {
    // Upsert by email. If it exists, we deliberately don't reset status —
    // an ACTIVE subscriber who re-enters their email can still update prefs.
    // Always-subscribed emails are reactivated + given a subscription stamp.
    const subscriber = await prisma.subscriber.upsert({
      where: { email },
      update: forceSubscribed
        ? { status: "ACTIVE", subscribedAt: new Date() }
        : {},
      create: {
        email,
        interests: [],
        status: forceSubscribed ? "ACTIVE" : "PENDING_PREFERENCES",
        subscribedAt: forceSubscribed ? new Date() : null,
      },
      select: {
        status: true,
        subscribedAt: true,
        interests: true,
        sourceLanguage: true,
        summaryLanguage: true,
      },
    });

    const subscribed =
      forceSubscribed ||
      (subscriber.subscribedAt != null && subscriber.status !== "UNSUBSCRIBED");

    const hasPrefs = subscriber.interests.length > 0;
    const preferences = hasPrefs
      ? {
          interests: subscriber.interests,
          sourceLanguage: subscriber.sourceLanguage ?? "Any",
          summaryLanguage: subscriber.summaryLanguage ?? "English",
        }
      : null;

    return NextResponse.json({ ok: true, subscribed, preferences });
  } catch (err) {
    // Don't leak internal errors to the client.
    console.error("[/api/signup/start] db error:", err);
    return NextResponse.json(
      { ok: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
