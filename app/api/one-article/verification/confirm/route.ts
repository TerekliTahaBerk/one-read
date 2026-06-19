import { NextResponse } from "next/server";
import { parseEmail } from "@/lib/options";
import {
  VERIFICATION_PURPOSES,
  confirmVerificationCode,
  emailVerificationSecretConfigured,
  setVerifiedEmailCookie,
} from "@/lib/one-article/verification";
import {
  ensureOneArticleSubscription,
  preferencesComplete,
  toEligibilityInput,
} from "@/lib/subscriptions";
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
 * POST /api/one-article/verification/confirm
 * Body: { email: string, code: string }
 *
 * Verifies the 6-digit code. On success, sets a short-lived verified-email
 * session cookie and reports the next UI state (set up vs edit preferences).
 * Never grants billing access — Polar remains the source of truth.
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

  const result = await confirmVerificationCode({
    email,
    purpose: VERIFICATION_PURPOSES.signup,
    code,
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, verified: false, error: result.reason },
      { status: ERROR_STATUS[result.reason] ?? 400 },
    );
  }

  // Ownership is now proven, so it's safe to materialize the Contact +
  // ProductSubscription (created at PENDING_PREFERENCES / ADMIN_OVERRIDE for the
  // founder). This starts no trial and grants no access — Polar remains the
  // source of truth. Records are created here, after verification, never before.
  const sub = await ensureOneArticleSubscription(email);
  const hasPrefs = preferencesComplete(sub.preferences);
  const subscribed = hasValidAccess(toEligibilityInput(sub)).allowed;
  const preferences = hasPrefs
    ? {
        interests: sub.preferences?.interests ?? [],
        sourceLanguage: sub.preferences?.sourceLanguage ?? "Any",
        summaryLanguage: sub.preferences?.summaryLanguage ?? "English",
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
  setVerifiedEmailCookie(res, email, VERIFICATION_PURPOSES.signup);
  return res;
}
