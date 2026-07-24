import { NextResponse } from "next/server";
import { parseEmail } from "@/lib/options";
import {
  VERIFICATION_PURPOSES,
  confirmVerificationCode,
  emailVerificationSecretConfigured,
  setVerifiedEmailCookie,
} from "@/lib/oneread/verification";
import {
  ensureOneReadSubscription,
  ensureArticlePreferencesHolder,
} from "@/lib/oneread/access";
import { preferencesComplete } from "@/lib/subscriptions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ERROR_STATUS: Record<string, number> = {
  invalid: 400,
  expired: 410,
  too_many: 429,
  incorrect: 401,
};

/**
 * POST /api/oneread/verification/confirm
 * Body: { email: string, code: string }
 *
 * Verifies the 6-digit code. On success, sets a short-lived verified-email
 * session cookie, materializes the OneRead subscription + OneArticle
 * preference holder (no billing/trial started here — Polar remains the
 * source of truth), and reports current preference-completion state so the
 * UI can route to the right onboarding step.
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

  const oneRead = await ensureOneReadSubscription(email);
  const articleHolder = await ensureArticlePreferencesHolder(oneRead.contactId);

  const res = NextResponse.json({
    ok: true,
    verified: true,
    email,
    articlePreferencesComplete: preferencesComplete(articleHolder.preferences),
  });
  setVerifiedEmailCookie(res, email, VERIFICATION_PURPOSES.signup);
  return res;
}
