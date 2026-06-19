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
import {
  ensureOneNewsSubscription,
  upsertNewsPreferences,
  markNewsReadyForCheckout,
} from "@/lib/news/subscriptions";
import { hasVerifiedNewsEmail } from "@/lib/news/verification";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/news/preferences
 *
 * Saves OneNews preferences and marks the subscription ready for Polar
 * checkout. Requires a verified OneNews email (proves ownership only — grants
 * no access). Never sends email or starts a local trial; Polar is the source
 * of truth for trial/paid access.
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

  if (!hasVerifiedNewsEmail(email)) {
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
    const sub = await ensureOneNewsSubscription(email);
    await upsertNewsPreferences(
      { id: sub.id, contactId: sub.contactId },
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
    await markNewsReadyForCheckout(sub.id);
  } catch (err) {
    console.error("[/api/news/preferences] db error:", err);
    return NextResponse.json(
      { ok: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
