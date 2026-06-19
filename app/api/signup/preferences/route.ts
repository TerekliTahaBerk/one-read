import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  parseEmail,
  parseInterests,
  parseSourceLanguage,
  parseSummaryLanguage,
} from "@/lib/options";
import { interestLabelsToSlugs } from "@/lib/topics";
import {
  ensureOneArticleSubscription,
  upsertArticlePreferences,
  markReadyForCheckout,
} from "@/lib/subscriptions";
import { hasVerifiedEmail } from "@/lib/one-article/verification";

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
 * ready for Polar checkout. Does not send email or grant access; Polar
 * checkout/webhooks are the source of truth for trial/paid access.
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

  // Email ownership must be proven (6-digit code) before preferences can be
  // written through the public flow. Admin edits go through the admin APIs and
  // are not affected. This proves ownership only — it grants no access.
  if (!hasVerifiedEmail(email)) {
    return NextResponse.json(
      { ok: false, error: "email_not_verified" },
      { status: 401 },
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
        status: "PENDING_CHECKOUT",
      },
      create: {
        email,
        interests,
        primaryInterest,
        secondaryInterests,
        sourceLanguage,
        summaryLanguage,
        status: "PENDING_CHECKOUT",
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

  return NextResponse.json({ ok: true });
}
