import { NextResponse } from "next/server";
import {
  parseEmail,
  parseFilmEmailLanguage,
  parseFilmGenres,
  parseFilmMoods,
  parseFilmDecades,
  parseFilmLanguages,
  parseFilmPlatforms,
  parseFilmSpoilerPreference,
  parseFilmFamiliarity,
  parseFilmRuntimePreference,
} from "@/lib/options";
import {
  ensureOneFilmSubscription,
  upsertFilmPreferences,
  markFilmReadyForCheckout,
} from "@/lib/film/subscriptions";
import { hasVerifiedFilmEmail } from "@/lib/film/verification";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/film/preferences
 *
 * Saves OneFilm preferences and marks the subscription ready for Polar
 * checkout. Requires a verified OneFilm email. Never grants access — Polar is
 * the source of truth.
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

  if (!hasVerifiedFilmEmail(email)) {
    return NextResponse.json({ ok: false, error: "email_not_verified" }, { status: 401 });
  }

  const emailLanguage = parseFilmEmailLanguage(payload.emailLanguage);
  if (!emailLanguage) {
    return NextResponse.json({ ok: false, error: "Please choose an email language." }, { status: 400 });
  }

  const preferredGenres = parseFilmGenres(payload.preferredGenres);
  if (!preferredGenres) {
    return NextResponse.json({ ok: false, error: "Please choose at least one genre." }, { status: 400 });
  }

  const moods = parseFilmMoods(payload.moods) ?? [];
  const decades = parseFilmDecades(payload.decades) ?? [];
  const languages = parseFilmLanguages(payload.languages) ?? [];
  const platforms = parseFilmPlatforms(payload.platforms) ?? [];
  const spoilerPreference = parseFilmSpoilerPreference(payload.spoilerPreference) ?? "Spoiler-light";
  const familiarity = parseFilmFamiliarity(payload.familiarity) ?? "Mixed";
  const runtimePreference = parseFilmRuntimePreference(payload.runtimePreference) ?? "Any";

  try {
    const sub = await ensureOneFilmSubscription(email);
    await upsertFilmPreferences(
      { id: sub.id, contactId: sub.contactId },
      {
        emailLanguage,
        preferredGenres,
        moods,
        decades,
        languages,
        platforms,
        spoilerPreference,
        familiarity,
        runtimePreference,
      },
    );
    await markFilmReadyForCheckout(sub.id);
  } catch (err) {
    console.error("[/api/film/preferences] db error:", err);
    return NextResponse.json(
      { ok: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
