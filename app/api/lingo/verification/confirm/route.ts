import { NextResponse } from "next/server";
import { parseEmail } from "@/lib/options";
import {
  LINGO_VERIFICATION_PURPOSES,
  confirmLingoVerificationCode,
  emailVerificationSecretConfigured,
  setLingoVerifiedEmailCookie,
} from "@/lib/lingo/verification";
import {
  ensureOneLingoSubscription,
  lingoPreferencesComplete,
  toLingoEligibilityInput,
} from "@/lib/lingo/subscriptions";
import { hasValidAccess } from "@/lib/billing/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ERROR_STATUS: Record<string, number> = {
  invalid: 400,
  expired: 410,
  too_many: 429,
  incorrect: 401,
};

/**
 * POST /api/lingo/verification/confirm
 * Body: { email: string, code: string }
 *
 * Verifies the 6-digit OneLingo code. On success, sets a short-lived
 * verified-email session cookie and reports the next UI state (set up vs edit
 * preferences). Never grants billing access — Polar remains the source of truth.
 */
export async function POST(req: Request) {
  if (!emailVerificationSecretConfigured()) {
    return NextResponse.json(
      { ok: false, error: "verification_not_configured" },
      { status: 503 },
    );
  }

  let body: { email?: unknown; code?: unknown };
  try {
    body = (await req.json()) as { email?: unknown; code?: unknown };
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_request" }, { status: 400 });
  }

  const email = parseEmail(body.email);
  if (!email) {
    return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
  }

  const code = typeof body.code === "string" ? body.code.trim() : "";
  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json({ ok: false, error: "invalid_code_format" }, { status: 400 });
  }

  const result = await confirmLingoVerificationCode({
    email,
    purpose: LINGO_VERIFICATION_PURPOSES.signup,
    code,
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, verified: false, error: result.reason },
      { status: ERROR_STATUS[result.reason] ?? 400 },
    );
  }

  // Ownership proven — safe to materialize the Contact + OneLingo subscription
  // (PENDING_PREFERENCES, or ADMIN_OVERRIDE for the founder). No trial, no
  // access. Polar remains the source of truth.
  const sub = await ensureOneLingoSubscription(email);
  const hasPrefs = lingoPreferencesComplete(sub.lingoPreferences);
  const subscribed = hasValidAccess(toLingoEligibilityInput(sub)).allowed;
  const preferences = hasPrefs
    ? {
        targetLanguage: sub.lingoPreferences?.targetLanguage ?? null,
        nativeLanguage: sub.lingoPreferences?.nativeLanguage ?? null,
        level: sub.lingoPreferences?.level ?? null,
        learningGoal: sub.lingoPreferences?.learningGoal ?? null,
        practiceStyle: sub.lingoPreferences?.practiceStyle ?? null,
        interests: sub.lingoPreferences?.interests ?? [],
        minutesPerDay: sub.lingoPreferences?.minutesPerDay ?? 5,
        wantsVocabulary: sub.lingoPreferences?.wantsVocabulary ?? true,
        wantsPhrases: sub.lingoPreferences?.wantsPhrases ?? true,
        wantsGrammar: sub.lingoPreferences?.wantsGrammar ?? true,
        wantsMiniQuiz: sub.lingoPreferences?.wantsMiniQuiz ?? true,
        wantsCultureNote: sub.lingoPreferences?.wantsCultureNote ?? false,
      }
    : null;

  const next = hasPrefs ? "edit_preferences" : "preferences";

  const res = NextResponse.json({
    ok: true,
    verified: true,
    next,
    email,
    subscribed,
    preferences,
  });
  setLingoVerifiedEmailCookie(res, email, LINGO_VERIFICATION_PURPOSES.signup);
  return res;
}
