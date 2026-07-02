import { NextResponse } from "next/server";
import { parseEmail, parseInterests, parseSourceLanguage, parseSummaryLanguage } from "@/lib/options";
import { upsertArticlePreferences } from "@/lib/subscriptions";
import {
  ensureOneReadSubscription,
  ensureArticlePreferencesHolder,
  markOneReadReadyForCheckoutIfEligible,
} from "@/lib/oneread/access";
import { hasVerifiedEmail } from "@/lib/oneread/verification";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/oneread/article-preferences
 *
 * Saves OneArticle preferences for a verified OneRead email. Never grants
 * billing access — Polar remains the source of truth. Once at least one of
 * Article/Film preferences is complete, the umbrella `one-read` row moves to
 * PENDING_CHECKOUT so the review step can start checkout.
 */
export async function POST(request: Request) {
  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const email = parseEmail(payload.email);
  if (!email) {
    return NextResponse.json({ ok: false, error: "Please enter a valid email." }, { status: 400 });
  }

  if (!hasVerifiedEmail(email)) {
    return NextResponse.json({ ok: false, error: "email_not_verified" }, { status: 401 });
  }

  const interests = parseInterests(payload.interests);
  if (!interests) {
    return NextResponse.json({ ok: false, error: "Please choose at least one interest." }, { status: 400 });
  }
  const summaryLanguage = parseSummaryLanguage(payload.summaryLanguage);
  if (!summaryLanguage) {
    return NextResponse.json({ ok: false, error: "Please choose a summary language." }, { status: 400 });
  }
  const sourceLanguage = parseSourceLanguage(payload.sourceLanguage) ?? "Any";
  const primaryInterest = typeof payload.primaryInterest === "string" ? payload.primaryInterest : null;
  const secondaryInterests = Array.isArray(payload.secondaryInterests)
    ? interests.filter((i) => (payload.secondaryInterests as unknown[]).includes(i))
    : [];

  try {
    const oneRead = await ensureOneReadSubscription(email);
    const holder = await ensureArticlePreferencesHolder(oneRead.contactId);
    await upsertArticlePreferences(holder.id, {
      interests,
      primaryInterest,
      secondaryInterests,
      sourceLanguage,
      summaryLanguage,
    });
    await markOneReadReadyForCheckoutIfEligible(oneRead.contactId);
  } catch (err) {
    console.error("[/api/oneread/article-preferences] db error:", err);
    return NextResponse.json(
      { ok: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
