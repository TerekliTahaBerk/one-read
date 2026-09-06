import { NextResponse } from "next/server";
import { parseEmail } from "@/lib/options";
import { parseCheckoutIntent } from "@/lib/billing/checkout-intent";
import {
  VERIFICATION_PURPOSES,
  confirmVerificationCode,
  emailVerificationSecretConfigured,
  setVerifiedEmailCookie,
} from "@/lib/oneread/verification";

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
 * session cookie. Verification proves identity only: offer/subscription rows
 * are created after the user saves the offer-scoped preferences. This keeps an
 * abandoned verification from creating phantom billing rows.
 *
 * When the body names the offer and interval the user is verifying for, that
 * pair is frozen into the session as a purchase intent and checkout will only
 * honour that exact pair (see lib/billing/checkout-intent.ts). An unknown or
 * half-supplied pair is rejected rather than silently dropped, so a bad value
 * can never downgrade the session to the unbound, any-offer variety.
 */
export async function POST(req: Request) {
  if (!emailVerificationSecretConfigured()) {
    return NextResponse.json(
      { ok: false, error: "verification_not_configured" },
      { status: 503 },
    );
  }

  let body: { email?: unknown; code?: unknown; offer?: unknown; interval?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_request" }, { status: 400 });
  }

  const email = parseEmail(body.email);
  if (!email) {
    return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
  }

  const intentRequested = body.offer !== undefined || body.interval !== undefined;
  const intent = intentRequested ? parseCheckoutIntent(body.offer, body.interval) : null;
  if (intentRequested && !intent) {
    return NextResponse.json({ ok: false, error: "unknown_plan_selection" }, { status: 400 });
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

  const res = NextResponse.json({
    ok: true,
    verified: true,
    email,
    articlePreferencesComplete: false,
    articlePreferences: null,
  });
  setVerifiedEmailCookie(res, email, VERIFICATION_PURPOSES.signup, intent);
  return res;
}
