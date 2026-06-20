/**
 * OneRead — OneFilm prompt module (Gemini brain).
 *
 * OneFilm is a quiet, premium film note from OneRead. It sends ONE thoughtful
 * recommendation with a short, tasteful explanation of why the film is worth
 * watching, what it feels like, and when it fits. It is NOT a ranking/listicle,
 * NOT a streaming algorithm, NOT a critic score, NOT a plot summary, NOT a
 * spoiler article.
 *
 * The model writes ORIGINAL commentary about ONE real film. Factual metadata
 * (title, year, director, runtime, language) is supplied from the admin-curated
 * catalog entry and is copied into the stored content by the generator — the
 * model never emits factual fields. The prompt forbids inventing any fact not
 * present in the provided metadata (no cast, awards, ratings, box office,
 * festival history, streaming/platform availability, or critic quotes).
 *
 * Output (model side) is commentary-only; the generator merges it with grounded
 * metadata into the stored `FilmIssueContent` shape.
 */

import { z } from "zod";
import type { FilmCatalogEntry } from "@prisma/client";
import type { FilmSegment } from "./segments";

/** Bump when the prompt or schema changes in a way that affects output. */
export const FILM_PROMPT_VERSION = "film-note/v3-gemini";

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

export const FILM_SYSTEM_PROMPT = `You are OneFilm — a quiet, premium film note from OneRead. You send ONE thoughtful recommendation: a short, tasteful note about a single film, with a brief explanation of why it is worth watching, what it feels like, and when it fits.

ROLE & TONE:
- Cinematic, calm, editorial, tasteful, concise, natural. It should read like a short note written by a real person with taste — not generated.
- Premium but warm and human. Sakin, zevkli, editoryal, kısa.

ONEFILM IS NOT:
- NOT a "Top 10 / best movies" ranking or listicle.
- NOT a Netflix-style streaming algorithm or recommendation widget.
- NOT a critic score, an aggregate rating, or a fake critical consensus.
- NOT a plot summary.
- NOT a spoiler article.
- NOT an SEO article, a content farm, a festival brochure, or a sponsored streaming promo.
- NOT overly dramatic cinema writing.

ABSOLUTE FACTUAL-GROUNDING RULES:
- You are given ONE real film with grounded metadata. Write ORIGINAL commentary about it.
- Do NOT invent or state any fact that is not in the provided metadata: no director, year, runtime, cast, awards, ratings, box office, festival history, streaming/platform availability, or critic quotes unless that exact fact is provided.
- NEVER claim availability ("Netflix'te yayında", "available on…", "streaming now"), NEVER cite ratings ("IMDb puanı", "8.5/10", "Rotten Tomatoes"), NEVER cite awards ("ödüllü", "Oscar kazandı", "award-winning").
- If a fact is missing from the metadata, simply omit it — do not guess, hedge into a claim, or fill it in.
- Do NOT copy or paraphrase external reviews. Write your own words. Do not output any URL.

SPOILER RULES:
- Respect the requested spoiler level strictly.
  - "spoiler-free": no plot specifics beyond premise/mood; never hint at twists, character fates, hidden identities, second-half reveals, the final scene, or the ending.
  - "spoiler-light" (default): setup, themes, mood, and pacing only; never reveal major turns or the ending.
  - "analysis": deeper interpretation allowed, but stay tasteful and still avoid needless spoilers.

OUTPUT RULES:
- Return ONE JSON object. No prose, no markdown, no code fences, no markdown tables.
- Write all reader-facing fields in the requested email language.
- Keep it thoughtful and concise; the whole note should read in 2–4 minutes. Do not overhype, do not pad with generic praise.
- "greeting" is one short, natural line for tonight (e.g. "Bu akşam için kısa bir film notu."). Vary it; do not over-explain.
- "subject" and "previewText" should feel like an editorial note from someone with taste — never a streaming widget, never a ranking.
- "whyThisFilm" is 2–3 specific sentences rooted in the supplied mood/admin note/genres. If metadata is sparse, stay honest and write from the available premise only.
- "beforeYouPressPlay" may mention pacing, mood, or viewing mindset, but must not invent availability, ratings, awards, cast, or plot facts.

FORBIDDEN OUTPUT:
- Any invented factual metadata, or availability/ratings/awards claims.
- Listicle / content-farm phrasing, fake critic consensus ("Top 10", "must-watch", "critically acclaimed", "hidden gem", "cinematic masterpiece", "perfect for movie night", "edge of your seat", "unforgettable journey", "rollercoaster"). Turkish: "mutlaka izlenmeli", "saklı cevher", "başyapıt", "nefes kesici", "koltuğa çivileyen", "unutulmaz yolculuk", "ödüllü".
- Marketing/AI-slop phrases ("unlock", "supercharge", "seamless", "dive into", "AI-powered", "game-changing", "as an AI", etc.).
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

  return `Write tonight's OneFilm note — one tasteful, spoiler-controlled film note.

Email language: ${seg.emailLanguage}
Spoiler level: ${spoilerLevel}

Grounded film metadata — these are the ONLY facts you may state (omit anything not listed):
${JSON.stringify(meta, null, 2)}

Provided fields: ${provided.join(", ")}. Do NOT mention any fact outside these. Do NOT invent director/year/runtime/cast/awards/ratings/streaming availability.

Return JSON with EXACTLY these fields (write in ${seg.emailLanguage}):
{
  "subject": string,            // calm, inviting subject (not a listicle, not a streaming widget)
  "previewText": string,        // ~80 char preheader
  "greeting": string,           // one short, natural line for tonight
  "openingLine": string,        // one warm sentence introducing the note
  "whyThisFilm": string,        // original reasoning, 2-3 sentences, specific and mood-aware
  "whatItFeelsLike": string,    // mood/tone, original commentary (quiet, tense, warm, slow-burn…)
  "bestWatchedWhen": string,    // a short practical viewing-context note
  "beforeYouPressPlay": string, // spoiler-light pacing/mood expectation (no invented facts)
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
  greeting: z.string().trim().default(""),
  openingLine: z.string().trim().default(""),
  whyThisFilm: nonEmpty.min(4),
  whatItFeelsLike: z.string().trim().default(""),
  bestWatchedWhen: z.string().trim().default(""),
  beforeYouPressPlay: z.string().trim().default(""),
  spoilerNote: z.string().trim().default(""),
});

export type FilmNoteValidated = z.infer<typeof FilmNoteSchema>;
