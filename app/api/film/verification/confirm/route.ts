import { NextResponse } from "next/server";
import { parseEmail } from "@/lib/options";
import {
  FILM_VERIFICATION_PURPOSES,
  confirmFilmVerificationCode,
  emailVerificationSecretConfigured,
  setFilmVerifiedEmailCookie,
} from "@/lib/film/verification";
import {
  ensureOneFilmSubscription,
  filmPreferencesComplete,
  toFilmEligibilityInput,
} from "@/lib/film/subscriptions";
import { hasValidAccess } from "@/lib/billing/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ERROR_STATUS: Record<string, number> = {
  invalid: 400,
  expired: 410,
  too_many: 429,
  incorrect: 401,
};

export async function POST(req: Request) {
  if (!emailVerificationSecretConfigured()) {
    return NextResponse.json({ ok: false, error: "verification_not_configured" }, { status: 503 });
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
  const result = await confirmFilmVerificationCode({
    email,
    purpose: FILM_VERIFICATION_PURPOSES.signup,
    code,
  });
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, verified: false, error: result.reason },
      { status: ERROR_STATUS[result.reason] ?? 400 },
    );
  }

  const sub = await ensureOneFilmSubscription(email);
  const hasPrefs = filmPreferencesComplete(sub.filmPreferences);
  const preferences = hasPrefs && sub.filmPreferences
    ? {
        emailLanguage: sub.filmPreferences.emailLanguage,
        preferredGenres: sub.filmPreferences.preferredGenres,
        moods: sub.filmPreferences.moods,
        decades: sub.filmPreferences.decades,
        languages: sub.filmPreferences.languages,
        platforms: sub.filmPreferences.platforms,
        spoilerPreference: sub.filmPreferences.spoilerPreference,
        familiarity: sub.filmPreferences.familiarity,
        runtimePreference: sub.filmPreferences.runtimePreference,
      }
    : null;
  const res = NextResponse.json({
    ok: true,
    verified: true,
    next: hasPrefs ? "edit_preferences" : "preferences",
    email,
    subscribed: hasValidAccess(toFilmEligibilityInput(sub)).allowed,
    preferences,
  });
  setFilmVerifiedEmailCookie(res, email, FILM_VERIFICATION_PURPOSES.signup);
  return res;
}
