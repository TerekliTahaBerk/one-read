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
  const subscribed = hasValidAccess(toFilmEligibilityInput(sub)).allowed;
  const p = sub.filmPreferences;
  const preferences = hasPrefs
    ? {
        emailLanguage: p?.emailLanguage ?? null,
        preferredGenres: p?.preferredGenres ?? [],
        moods: p?.moods ?? [],
        decades: p?.decades ?? [],
        languages: p?.languages ?? [],
        platforms: p?.platforms ?? [],
        spoilerPreference: p?.spoilerPreference ?? "spoiler-light",
        familiarity: p?.familiarity ?? "mixed",
        runtimePreference: p?.runtimePreference ?? "any",
      }
    : null;

  const next = hasPrefs ? "edit_preferences" : "preferences";

  const res = NextResponse.json({ ok: true, verified: true, next, email, subscribed, preferences });
  setFilmVerifiedEmailCookie(res, email, FILM_VERIFICATION_PURPOSES.signup);
  return res;
}
