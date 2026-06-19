import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import type { FilmCatalogEntry } from "@prisma/client";
import type { FilmSegment } from "./segments";
import type { FilmIssueContent, GeneratedFilmIssue } from "./types";

/**
 * OneFilm note generator. Writes ORIGINAL recommendation commentary based on a
 * grounded film (admin-curated FilmCatalogEntry). It must NOT invent cast,
 * awards, ratings, or streaming availability — factual metadata is copied only
 * from the catalog entry, and omitted honestly when unknown. With no film it
 * returns generated:false (NO_FILM) so the pipeline shows an admin warning
 * instead of fabricating a film.
 *
 * Pure: never reads or writes the database. The pipeline handles caching.
 */

export interface FilmGenerateOptions {
  spoilerPreference?: string | null;
  /** Allow deterministic (non-AI) framing in production. Default true — it uses
   *  only the admin note + grounded metadata, so it invents nothing. */
  allowDeterministic?: boolean;
}

const SYSTEM_PROMPT = `You are OneFilm, a warm, thoughtful film writer who sends one short note about a single film.
Tone: cinematic, thoughtful, editorial, warm, concise. Never content-farm, never "Top 10", never hype, never spoiler-heavy.
HARD RULES:
- You are given ONE real film with grounded metadata. Write ORIGINAL commentary about it.
- Do NOT invent cast, awards, ratings, box office, or streaming availability. If a fact is not in the provided metadata, do not state it.
- Respect the spoiler preference. Default to spoiler-light: hint at themes/mood, never reveal twists or endings.
- Do not copy or paraphrase external reviews. Write your own words.
Return STRICT JSON ONLY matching the requested schema.`;

function buildUserPrompt(
  seg: FilmSegment,
  film: FilmCatalogEntry,
  opts: FilmGenerateOptions,
): string {
  const meta = {
    title: film.title,
    year: film.year ?? null,
    director: film.director ?? null,
    language: film.filmLanguage ?? null,
    runtimeMinutes: film.runtimeMinutes ?? null,
    adminNote: film.adminNote ?? "",
  };
  return `Write today's OneFilm note.

Email language: ${seg.emailLanguage}
Spoiler preference: ${opts.spoilerPreference ?? "Spoiler-light"}

Grounded film metadata (only use facts present here):
${JSON.stringify(meta, null, 2)}

Return JSON with EXACTLY these fields (write in ${seg.emailLanguage}):
{
  "subject": string,            // calm, inviting email subject
  "previewText": string,        // ~80 char preheader
  "openingLine": string,        // one warm sentence
  "whyThisFilm": string,        // original reasoning, 2-3 sentences
  "whatItFeelsLike": string,    // mood/tone, original commentary
  "bestWatchedWhen": string,    // when/with whom it fits
  "beforeYouPressPlay": string, // practical, spoiler-aware note
  "spoilerNote": string         // a one-line note honoring the spoiler preference
}`;
}

async function callJson(
  system: string,
  user: string,
): Promise<{ raw: unknown | null; provider: string | null; model: string | null }> {
  const provider = (process.env.AI_PROVIDER || "").toLowerCase();

  if (provider === "anthropic" && process.env.ANTHROPIC_API_KEY) {
    const model = process.env.AI_MODEL || "claude-3-5-haiku-latest";
    try {
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const res = await client.messages.create({
        model,
        max_tokens: 1536,
        temperature: 0.6,
        system,
        messages: [{ role: "user", content: user }],
      });
      const block = res.content?.[0];
      const text = block && "text" in block ? block.text : "";
      return { raw: text ? safeJson(text) : null, provider: "anthropic", model };
    } catch (err) {
      console.error("[film/generator] anthropic call failed:", errMsg(err));
      return { raw: null, provider: "anthropic", model };
    }
  }

  if (provider === "openai" && process.env.OPENAI_API_KEY) {
    const model = process.env.AI_MODEL || "gpt-4o-mini";
    try {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const res = await client.chat.completions.create({
        model,
        temperature: 0.6,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      });
      const text = res.choices?.[0]?.message?.content ?? "";
      return { raw: text ? safeJson(text) : null, provider: "openai", model };
    } catch (err) {
      console.error("[film/generator] openai call failed:", errMsg(err));
      return { raw: null, provider: "openai", model };
    }
  }

  return { raw: null, provider: null, model: null };
}

export async function generateFilmIssue(
  seg: FilmSegment,
  film: FilmCatalogEntry | null,
  opts: FilmGenerateOptions = {},
): Promise<GeneratedFilmIssue> {
  if (!film) {
    return {
      title: "Tonight’s film note",
      subject: "OneFilm: one film worth thinking about",
      previewText: "",
      content: emptyContent(),
      generated: false,
      reason: "NO_FILM",
      provider: null,
      model: null,
      metadata: { source: "none", reason: "no_film_available" },
    };
  }

  const groundedMetadata = buildMetadata(film);
  const { raw, provider, model } = await callJson(
    SYSTEM_PROMPT,
    buildUserPrompt(seg, film, opts),
  );

  const parsed = raw ? parseIssue(raw, film, groundedMetadata) : null;
  if (parsed) {
    return {
      ...parsed,
      generated: true,
      provider,
      model,
      metadata: { source: "ai", provider, model, filmId: film.id },
    };
  }

  if (opts.allowDeterministic !== false) {
    return {
      ...deterministicIssue(film, groundedMetadata),
      generated: true,
      provider: "deterministic",
      model: "deterministic",
      metadata: { source: "deterministic", aiAttempted: provider !== null, filmId: film.id },
    };
  }

  return {
    title: "Tonight’s film note",
    subject: "OneFilm: one film worth thinking about",
    previewText: "",
    content: emptyContent(),
    generated: false,
    reason: "GENERATION_UNAVAILABLE",
    provider,
    model,
    metadata: { source: "none" },
  };
}

function buildMetadata(film: FilmCatalogEntry): FilmIssueContent["metadata"] {
  const meta: NonNullable<FilmIssueContent["metadata"]> = {};
  if (film.year != null) meta.year = film.year;
  if (film.director) meta.director = film.director;
  if (film.filmLanguage) meta.language = film.filmLanguage;
  if (film.runtimeMinutes != null) meta.runtimeMinutes = film.runtimeMinutes;
  // whereToWatch is intentionally omitted — never invent availability.
  return Object.keys(meta).length > 0 ? meta : undefined;
}

function parseIssue(
  raw: unknown,
  film: FilmCatalogEntry,
  metadata: FilmIssueContent["metadata"],
): Omit<GeneratedFilmIssue, "generated" | "provider" | "model" | "metadata"> | null {
  if (!isRecord(raw)) return null;
  const content: FilmIssueContent = {
    openingLine: str(raw.openingLine, "A quiet film for a long evening."),
    filmTitle: film.title,
    whyThisFilm: str(raw.whyThisFilm, ""),
    whatItFeelsLike: str(raw.whatItFeelsLike, ""),
    bestWatchedWhen: str(raw.bestWatchedWhen, ""),
    beforeYouPressPlay: str(raw.beforeYouPressPlay, ""),
    spoilerNote: str(raw.spoilerNote, "Spoiler-light — no twists revealed."),
    metadata,
  };
  if (content.whyThisFilm.length < 4) return null;
  const subject = str(raw.subject, `Tonight’s OneFilm: ${film.title}`);
  const previewText = str(raw.previewText, content.openingLine).slice(0, 140);
  return { title: film.title, subject, previewText, content };
}

function deterministicIssue(
  film: FilmCatalogEntry,
  metadata: FilmIssueContent["metadata"],
): Omit<GeneratedFilmIssue, "generated" | "provider" | "model" | "metadata"> {
  const note = (film.adminNote ?? "").trim();
  const content: FilmIssueContent = {
    openingLine: "One film worth thinking about tonight.",
    filmTitle: film.title,
    whyThisFilm: note || `A thoughtful recommendation: ${film.title}.`,
    whatItFeelsLike: "",
    bestWatchedWhen: "",
    beforeYouPressPlay: "",
    spoilerNote: "Spoiler-light — no twists revealed.",
    metadata,
  };
  return {
    title: film.title,
    subject: `Tonight’s OneFilm: ${film.title}`,
    previewText: "One thoughtful film note, made for a calmer evening.",
    content,
  };
}

function emptyContent(): FilmIssueContent {
  return {
    openingLine: "",
    filmTitle: "",
    whyThisFilm: "",
    whatItFeelsLike: "",
    bestWatchedWhen: "",
    beforeYouPressPlay: "",
    spoilerNote: "",
  };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function str(v: unknown, dflt: string): string {
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : dflt;
}

function safeJson(text: string): unknown | null {
  try {
    const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
