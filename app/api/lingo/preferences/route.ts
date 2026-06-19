import { NextResponse } from "next/server";
import {
  parseEmail,
  parseLingoTargetLanguage,
  parseLingoNativeLanguage,
  parseLingoLevel,
  parseLingoGoal,
  parseLingoPracticeStyle,
  parseLingoInterests,
  parseLingoMinutesPerDay,
} from "@/lib/options";
import {
  ensureOneLingoSubscription,
  upsertLingoPreferences,
  markLingoReadyForCheckout,
} from "@/lib/lingo/subscriptions";
import { hasVerifiedLingoEmail } from "@/lib/lingo/verification";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/lingo/preferences
 *
 * Saves OneLingo preferences and marks the subscription ready for Polar
 * checkout. Requires a verified OneLingo email (proves ownership only — grants
 * no access). Does not send email or start any local trial; Polar
 * checkout/webhooks are the source of truth for trial/paid access.
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
    return NextResponse.json(
      { ok: false, error: "Please enter a valid email." },
      { status: 400 },
    );
  }

  if (!hasVerifiedLingoEmail(email)) {
    return NextResponse.json(
      { ok: false, error: "email_not_verified" },
      { status: 401 },
    );
  }

  const targetLanguage = parseLingoTargetLanguage(payload.targetLanguage);
  if (!targetLanguage) {
    return NextResponse.json(
      { ok: false, error: "Please choose a language to learn." },
      { status: 400 },
    );
  }

  const nativeLanguage = parseLingoNativeLanguage(payload.nativeLanguage);
  if (!nativeLanguage) {
    return NextResponse.json(
      { ok: false, error: "Please choose your explanation language." },
      { status: 400 },
    );
  }

  const level = parseLingoLevel(payload.level);
  if (!level) {
    return NextResponse.json(
      { ok: false, error: "Please choose your level." },
      { status: 400 },
    );
  }

  const learningGoal = parseLingoGoal(payload.learningGoal);
  if (!learningGoal) {
    return NextResponse.json(
      { ok: false, error: "Please choose a learning goal." },
      { status: 400 },
    );
  }

  const practiceStyle = parseLingoPracticeStyle(payload.practiceStyle);
  if (!practiceStyle) {
    return NextResponse.json(
      { ok: false, error: "Please choose a practice style." },
      { status: 400 },
    );
  }

  const interests = parseLingoInterests(payload.interests);
  if (!interests) {
    return NextResponse.json(
      { ok: false, error: "Please choose at least one interest." },
      { status: 400 },
    );
  }

  const minutesPerDay = parseLingoMinutesPerDay(payload.minutesPerDay);

  // Content toggles default to the spec's defaults when omitted.
  const asBool = (v: unknown, dflt: boolean): boolean =>
    typeof v === "boolean" ? v : dflt;

  try {
    const sub = await ensureOneLingoSubscription(email);
    await upsertLingoPreferences(
      { id: sub.id, contactId: sub.contactId },
      {
        targetLanguage,
        nativeLanguage,
        level,
        learningGoal,
        practiceStyle,
        interests,
        minutesPerDay,
        wantsVocabulary: asBool(payload.wantsVocabulary, true),
        wantsPhrases: asBool(payload.wantsPhrases, true),
        wantsGrammar: asBool(payload.wantsGrammar, true),
        wantsMiniQuiz: asBool(payload.wantsMiniQuiz, true),
        wantsCultureNote: asBool(payload.wantsCultureNote, false),
      },
    );
    await markLingoReadyForCheckout(sub.id);
  } catch (err) {
    console.error("[/api/lingo/preferences] db error:", err);
    return NextResponse.json(
      { ok: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
