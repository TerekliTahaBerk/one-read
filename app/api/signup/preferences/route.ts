import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  parseEmail,
  parseInterests,
  parseSourceLanguage,
  parseSummaryLanguage,
} from "@/lib/options";
import { interestLabelsToSlugs } from "@/lib/topics";
import { sendWelcomeEmail } from "@/lib/resend";
import {
  ensureOneArticleSubscription,
  upsertArticlePreferences,
  markReadyForCheckout,
} from "@/lib/subscriptions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/signup/preferences
 * Body: {
 *   email: string,
 *   interests: string[],
 *   sourceLanguage: "English" | "Turkish" | "Any",
 *   summaryLanguage: "English" | "Turkish"
 * }
 *
 * Updates the subscriber's preferences and marks the product subscription
 * ready for Polar checkout. Sends a setup email via Resend, but never blocks
 * success on email delivery.
 */
export async function POST(request: Request) {
  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request." },
      { status: 400 },
    );
  }

  const email = parseEmail(payload.email);
  if (!email) {
    return NextResponse.json(
      { ok: false, error: "Please enter a valid email." },
      { status: 400 },
    );
  }

  const interests = parseInterests(payload.interests);
  if (!interests) {
    return NextResponse.json(
      { ok: false, error: "Please choose at least one interest." },
      { status: 400 },
    );
  }

  const sourceLanguage = parseSourceLanguage(payload.sourceLanguage);
  if (!sourceLanguage) {
    return NextResponse.json(
      { ok: false, error: "Please choose a source language." },
      { status: 400 },
    );
  }

  const summaryLanguage = parseSummaryLanguage(payload.summaryLanguage);
  if (!summaryLanguage) {
    return NextResponse.json(
      { ok: false, error: "Please choose a summary language." },
      { status: 400 },
    );
  }

  try {
    // Resolve canonical topic slugs from the user-facing labels.
    const slugs = interestLabelsToSlugs(interests);
    const primaryInterest = slugs[0] ?? null;
    const secondaryInterests = slugs.slice(1);

    // Legacy dual-write: keep the old Subscriber row in sync so the pre-cutover
    // pipeline/admin keep working and a rollback stays safe. Upsert handles the
    // edge case where someone hits step 2 directly (e.g. resumed flow).
    await prisma.subscriber.upsert({
      where: { email },
      update: {
        interests,
        primaryInterest,
        secondaryInterests,
        sourceLanguage,
        summaryLanguage,
        status: "ACTIVE",
      },
      create: {
        email,
        interests,
        primaryInterest,
        secondaryInterests,
        sourceLanguage,
        summaryLanguage,
        status: "ACTIVE",
      },
    });

    // New model: complete preferences, then wait for Polar checkout/webhook.
    // Polar owns the 7-day trial; local DB mirrors provider state only.
    const sub = await ensureOneArticleSubscription(email);
    await upsertArticlePreferences(sub.id, {
      interests,
      primaryInterest,
      secondaryInterests,
      sourceLanguage,
      summaryLanguage,
    });
    await markReadyForCheckout(sub.id);
  } catch (err) {
    console.error("[/api/signup/preferences] db error:", err);
    return NextResponse.json(
      { ok: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }

  // Fire-and-await, but never propagate failures to the client.
  // sendWelcomeEmail catches its own errors internally.
  await sendWelcomeEmail(email);

  return NextResponse.json({ ok: true });
}
