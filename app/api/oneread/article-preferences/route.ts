import { NextResponse } from "next/server";
import {
  parseEmail,
  parseInterests,
  parseSourceLanguage,
  parseSummaryLanguage,
} from "@/lib/options";
import { interestLabelsToSlugs } from "@/lib/topics";
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
 * billing access — Polar remains the source of truth. Once the OneArticle
 * preferences are complete, readiness is re-evaluated across OneArticle and
 * OneFilm before the umbrella row can move to PENDING_CHECKOUT.
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

  const summaryLanguage = parseSummaryLanguage(payload.summaryLanguage);
  if (!summaryLanguage) {
    return NextResponse.json({ ok: false, error: "Please choose a summary language." }, { status: 400 });
  }
  const interests = parseInterests(payload.interests);
  if (!interests) {
    return NextResponse.json({ ok: false, error: "Please choose at least one interest." }, { status: 400 });
  }
  const sourceLanguage = parseSourceLanguage(payload.sourceLanguage);
  if (!sourceLanguage) {
    return NextResponse.json({ ok: false, error: "Please choose a source language." }, { status: 400 });
  }
  const interestSlugs = interestLabelsToSlugs(interests);
  try {
    const oneRead = await ensureOneReadSubscription(email);
    const holder = await ensureArticlePreferencesHolder(oneRead.contactId);
    await upsertArticlePreferences(holder.id, {
      interests,
      primaryInterest: interestSlugs[0] ?? null,
      secondaryInterests: interestSlugs.slice(1),
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
