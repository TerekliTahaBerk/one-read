/**
 * OneRead — OneFilm prompt module (Gemini brain).
 *
 * The model writes ORIGINAL commentary about ONE real film. Factual metadata
 * (title, year, director, runtime, language) is supplied from the admin-curated
 * catalog entry and is copied into the stored content by the generator — the
 * model never emits factual fields. The prompt forbids inventing any fact not
 * present in the provided metadata.
 *
 * Output (model side) is commentary-only; the generator merges it with grounded
 * metadata into the stored `FilmIssueContent` shape (kept unchanged).
 */

import { z } from "zod";
import type { FilmCatalogEntry } from "@prisma/client";
import type { FilmSegment } from "./segments";

/** Bump when the prompt or schema changes in a way that affects output. */
export const FILM_PROMPT_VERSION = "film-note/v2-gemini";

/** Stored/exposed spoiler levels. */
export type SpoilerLevel = "spoiler-free" | "spoiler-light" | "analysis";

/** Maps a segment's spoiler preference to an output spoiler level. */
export function toSpoilerLevel(pref: string | null | undefined): SpoilerLevel {
  switch ((pref ?? "").toLowerCase()) {
    case "spoiler-free":
      return "spoiler-free";
    case "full analysis allowed":
    case "analysis":
    case "full":
      return "analysis";
    default:
      return "spoiler-light";
  }
}

export const FILM_SYSTEM_PROMPT = `You are OneFilm, a warm, thoughtful film writer who sends ONE short note about a single film.

ROLE & TONE:
- Cinematic, thoughtful, editorial, warm, concise. Like a short note from someone with taste.
- NEVER content-farm, never "Top 10 / best movies" listicle tone, never hype, never fake critic-speak.

ABSOLUTE FACTUAL-GROUNDING RULES:
- You are given ONE real film with grounded metadata. Write ORIGINAL commentary about it.
- Do NOT invent or state any fact that is not in the provided metadata: no director, year, runtime, cast, awards, ratings, box office, festival history, streaming/platform availability, or critic quotes unless that exact fact is provided.
- If a fact is missing from the metadata, simply omit it — do not guess, hedge into a claim, or fill it in.
- Do NOT copy or paraphrase external reviews. Write your own words. Do not output any URL.

SPOILER RULES:
- Respect the requested spoiler level.
  - "spoiler-free": no plot specifics beyond premise/mood; never hint at twists or the ending.
  - "spoiler-light" (default): themes and mood only; never reveal twists or the ending.
  - "analysis": deeper discussion allowed, but stay tasteful and flag it.

OUTPUT RULES:
- Return ONE JSON object. No prose, no markdown, no code fences.
- Write all fields in the requested email language.
- Keep it thoughtful and concise; do not overhype.
- Subject and previewText should feel like an editorial note from someone with taste, not a streaming recommendation widget.
- "whyThisFilm" should be 2-3 specific sentences rooted in the supplied mood/admin note/genres. If metadata is sparse, stay honest and write from the available premise only.
- "beforeYouPressPlay" may mention mood, pacing, or viewing mindset, but must not invent availability, rating, awards, cast, or plot facts.

FORBIDDEN OUTPUT:
- Any invented factual metadata or availability/ratings/awards claims.
- Listicle / content-farm phrasing, fake critic consensus.
- Marketing/AI-slop phrases ("unlock", "supercharge", "seamless", "dive into", "AI-powered", "game-changing", etc.).
- Any URL or fabricated source.`;

export function buildFilmUserPrompt(
  seg: FilmSegment,
  film: FilmCatalogEntry,
  spoilerLevel: SpoilerLevel,
): string {
  // Only real, present metadata is shown to the model.
  const meta: Record<string, unknown> = { title: film.title };
  if (film.year != null) meta.year = film.year;
  if (film.director) meta.director = film.director;
  if (film.filmLanguage) meta.language = film.filmLanguage;
  if (film.runtimeMinutes != null) meta.runtimeMinutes = film.runtimeMinutes;
  if (film.genres?.length) meta.genres = film.genres;
  if (film.moods?.length) meta.moods = film.moods;
  if (film.adminNote) meta.adminNote = film.adminNote;
  const provided = Object.keys(meta);

  return `Write today's OneFilm note.

Email language: ${seg.emailLanguage}
Spoiler level: ${spoilerLevel}

Grounded film metadata — these are the ONLY facts you may state (omit anything not listed):
${JSON.stringify(meta, null, 2)}

Provided fields: ${provided.join(", ")}. Do NOT mention any fact outside these.

Return JSON with EXACTLY these fields (write in ${seg.emailLanguage}):
{
  "subject": string,            // calm, inviting subject (not a listicle)
  "previewText": string,        // ~80 char preheader
  "openingLine": string,        // one warm sentence
  "whyThisFilm": string,        // original reasoning, 2-3 sentences
  "whatItFeelsLike": string,    // mood/tone, original commentary
  "bestWatchedWhen": string,    // when/with whom it fits
  "beforeYouPressPlay": string, // practical, spoiler-aware note (no invented facts)
  "spoilerNote": string         // one line honoring the "${spoilerLevel}" spoiler level
}`;
}

/* ----------------------------------------------------------------------- */
/* Schema (Zod) — validates the model's commentary-only output.             */
/* ----------------------------------------------------------------------- */

const nonEmpty = z.string().trim().min(1);

export const FilmNoteSchema = z.object({
  subject: nonEmpty.min(4),
  previewText: z.string().trim().default(""),
  openingLine: z.string().trim().default(""),
  whyThisFilm: nonEmpty.min(4),
  whatItFeelsLike: z.string().trim().default(""),
  bestWatchedWhen: z.string().trim().default(""),
  beforeYouPressPlay: z.string().trim().default(""),
  spoilerNote: z.string().trim().default(""),
});

export type FilmNoteValidated = z.infer<typeof FilmNoteSchema>;
