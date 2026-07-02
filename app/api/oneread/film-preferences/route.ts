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
import { upsertFilmPreferences } from "@/lib/film/subscriptions";
import {
  ensureOneReadSubscription,
  ensureFilmPreferencesHolder,
  markOneReadReadyForCheckoutIfEligible,
} from "@/lib/oneread/access";
import { hasVerifiedEmail } from "@/lib/oneread/verification";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/oneread/film-preferences
 *
 * Saves OneFilm preferences for a verified OneRead email. Never grants
 * billing access — Polar remains the source of truth. Once at least one of
 * Article/Film preferences is complete, the umbrella `one-read` row moves to
 * PENDING_CHECKOUT so the review step can start checkout.
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

  if (!hasVerifiedEmail(email)) {
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
    const oneRead = await ensureOneReadSubscription(email);
    const holder = await ensureFilmPreferencesHolder(oneRead.contactId);
    await upsertFilmPreferences(
      { id: holder.id, contactId: holder.contactId },
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
    await markOneReadReadyForCheckoutIfEligible(oneRead.contactId);
  } catch (err) {
    console.error("[/api/oneread/film-preferences] db error:", err);
    return NextResponse.json(
      { ok: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
