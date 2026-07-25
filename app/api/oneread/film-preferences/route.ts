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

export async function POST(request: Request) {
  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }
  const email = parseEmail(payload.email);
  if (!email) return NextResponse.json({ ok: false, error: "Please enter a valid email." }, { status: 400 });
  if (!hasVerifiedEmail(email)) return NextResponse.json({ ok: false, error: "email_not_verified" }, { status: 401 });
  const emailLanguage = parseFilmEmailLanguage(payload.emailLanguage);
  const preferredGenres = parseFilmGenres(payload.preferredGenres);
  if (!emailLanguage) return NextResponse.json({ ok: false, error: "Please choose an email language." }, { status: 400 });
  if (!preferredGenres) return NextResponse.json({ ok: false, error: "Please choose at least one genre." }, { status: 400 });
  try {
    const oneRead = await ensureOneReadSubscription(email);
    const holder = await ensureFilmPreferencesHolder(oneRead.contactId);
    await upsertFilmPreferences(
      { id: holder.id, contactId: holder.contactId },
      {
        emailLanguage,
        preferredGenres,
        moods: parseFilmMoods(payload.moods) ?? [],
        decades: parseFilmDecades(payload.decades) ?? [],
        languages: parseFilmLanguages(payload.languages) ?? [],
        platforms: parseFilmPlatforms(payload.platforms) ?? [],
        spoilerPreference: parseFilmSpoilerPreference(payload.spoilerPreference) ?? "Spoiler-light",
        familiarity: parseFilmFamiliarity(payload.familiarity) ?? "Mixed",
        runtimePreference: parseFilmRuntimePreference(payload.runtimePreference) ?? "Any",
      },
    );
    await markOneReadReadyForCheckoutIfEligible(oneRead.contactId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[/api/oneread/film-preferences] db error:", error);
    return NextResponse.json({ ok: false, error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
