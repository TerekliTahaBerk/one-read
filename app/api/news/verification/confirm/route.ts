import { NextResponse } from "next/server";
import { parseEmail } from "@/lib/options";
import {
  NEWS_VERIFICATION_PURPOSES,
  confirmNewsVerificationCode,
  emailVerificationSecretConfigured,
  setNewsVerifiedEmailCookie,
} from "@/lib/news/verification";
import {
  ensureOneNewsSubscription,
  newsPreferencesComplete,
  toNewsEligibilityInput,
} from "@/lib/news/subscriptions";
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
 * POST /api/news/verification/confirm
 * Body: { email: string, code: string }
 *
 * Verifies the 6-digit OneNews code. On success, sets a short-lived
 * verified-email session cookie and reports the next UI state. Never grants
 * billing access — Polar remains the source of truth.
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
  if (!email) return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });

  const code = typeof body.code === "string" ? body.code.trim() : "";
  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json({ ok: false, error: "invalid_code_format" }, { status: 400 });
  }

  const result = await confirmNewsVerificationCode({
    email,
    purpose: NEWS_VERIFICATION_PURPOSES.signup,
    code,
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, verified: false, error: result.reason },
      { status: ERROR_STATUS[result.reason] ?? 400 },
    );
  }

  const sub = await ensureOneNewsSubscription(email);
  const hasPrefs = newsPreferencesComplete(sub.newsPreferences);
  const subscribed = hasValidAccess(toNewsEligibilityInput(sub)).allowed;
  const p = sub.newsPreferences;
  const preferences = hasPrefs
    ? {
        briefingLanguage: p?.briefingLanguage ?? null,
        regionFocus: p?.regionFocus ?? null,
        topics: p?.topics ?? [],
        excludedTopics: p?.excludedTopics ?? [],
        tone: p?.tone ?? "calm",
        depth: p?.depth ?? "short",
        sourcePreference: p?.sourcePreference ?? "balanced",
        wantsWorld: p?.wantsWorld ?? true,
        wantsBusiness: p?.wantsBusiness ?? true,
        wantsTechnology: p?.wantsTechnology ?? true,
        wantsCulture: p?.wantsCulture ?? false,
        wantsScience: p?.wantsScience ?? false,
        wantsSports: p?.wantsSports ?? false,
      }
    : null;

  const next = hasPrefs ? "edit_preferences" : "preferences";

  const res = NextResponse.json({ ok: true, verified: true, next, email, subscribed, preferences });
  setNewsVerifiedEmailCookie(res, email, NEWS_VERIFICATION_PURPOSES.signup);
  return res;
}
