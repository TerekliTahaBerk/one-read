import { NextResponse } from "next/server";
import {
  parseEmail,
  parseNewsBriefingLanguage,
  parseNewsRegionFocus,
  parseNewsTopics,
  parseNewsExcludedTopics,
  parseNewsTone,
  parseNewsDepth,
  parseNewsSourcePreference,
} from "@/lib/options";
import { upsertNewsPreferences } from "@/lib/news/subscriptions";
import {
  ensureOneReadSubscription,
  ensureNewsPreferencesHolder,
  markOneReadReadyForCheckoutIfEligible,
} from "@/lib/oneread/access";
import { hasVerifiedEmail } from "@/lib/oneread/verification";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/oneread/news-preferences
 *
 * Saves OneNews preferences for a verified OneRead email. Never grants
 * billing access — Polar remains the source of truth. Once at least one of
 * Article/Film/News preferences is complete, the umbrella `one-read` row
 * moves to PENDING_CHECKOUT so the review step can start checkout.
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

  const briefingLanguage = parseNewsBriefingLanguage(payload.briefingLanguage);
  if (!briefingLanguage) {
    return NextResponse.json({ ok: false, error: "Please choose a briefing language." }, { status: 400 });
  }
  const regionFocus = parseNewsRegionFocus(payload.regionFocus);
  if (!regionFocus) {
    return NextResponse.json({ ok: false, error: "Please choose a region focus." }, { status: 400 });
  }

  const topics = parseNewsTopics(payload.topics) ?? [];
  const excludedTopics = parseNewsExcludedTopics(payload.excludedTopics) ?? [];
  const tone = parseNewsTone(payload.tone) ?? "Calm";
  const depth = parseNewsDepth(payload.depth) ?? "Short";
  const sourcePreference = parseNewsSourcePreference(payload.sourcePreference) ?? "Balanced";
  const asBool = (v: unknown, dflt: boolean): boolean => (typeof v === "boolean" ? v : dflt);

  try {
    const oneRead = await ensureOneReadSubscription(email);
    const holder = await ensureNewsPreferencesHolder(oneRead.contactId);
    await upsertNewsPreferences(
      { id: holder.id, contactId: holder.contactId },
      {
        briefingLanguage,
        regionFocus,
        topics,
        excludedTopics,
        tone,
        depth,
        sourcePreference,
        wantsWorld: asBool(payload.wantsWorld, true),
        wantsBusiness: asBool(payload.wantsBusiness, true),
        wantsTechnology: asBool(payload.wantsTechnology, true),
        wantsCulture: asBool(payload.wantsCulture, false),
        wantsScience: asBool(payload.wantsScience, false),
        wantsSports: asBool(payload.wantsSports, false),
      },
    );
    await markOneReadReadyForCheckoutIfEligible(oneRead.contactId);
  } catch (err) {
    console.error("[/api/oneread/news-preferences] db error:", err);
    return NextResponse.json(
      { ok: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
