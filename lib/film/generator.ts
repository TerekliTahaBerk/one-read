import type { FilmCatalogEntry } from "@prisma/client";
import {
  generateJsonWithGemini,
  geminiConfigured,
  buildGenerationMeta,
  stableHash,
} from "@/lib/ai";
import type { FilmSegment } from "./segments";
import {
  FILM_PROMPT_VERSION,
  FILM_SYSTEM_PROMPT,
  FilmNoteSchema,
  buildFilmUserPrompt,
  toSpoilerLevel,
  type FilmNoteValidated,
  type SpoilerLevel,
} from "./prompts";
import { runFilmGates, validateFilmMetadata } from "./quality";
import type { FilmIssueContent, GeneratedFilmIssue } from "./types";

/**
 * OneFilm note generator. Writes ORIGINAL recommendation commentary about a
 * grounded film (admin-curated FilmCatalogEntry) via the SHARED Gemini provider
 * (lib/ai). It must NOT invent cast, awards, ratings, streaming availability,
 * director, year, or runtime — factual metadata is copied only from the catalog
 * entry, and omitted honestly when unknown. With no film it returns
 * generated:false (NO_FILM) so the pipeline shows an admin warning instead of
 * fabricating a film.
 *
 * Pure: never reads or writes the database. The pipeline handles caching.
 */

export interface FilmGenerateOptions {
  spoilerPreference?: string | null;
  /**
   * Allow a deterministic (non-AI) grounded note as a fallback. It uses only the
   * admin note + grounded metadata (invents nothing). Default: dev only — in
   * production a Gemini failure means no note is sent unless explicitly set true.
   */
  allowDeterministic?: boolean;
}

export async function generateFilmIssue(
  seg: FilmSegment,
  film: FilmCatalogEntry | null,
  opts: FilmGenerateOptions = {},
): Promise<GeneratedFilmIssue> {
  const isProd = process.env.NODE_ENV === "production";

  // Rule #1: validate metadata FIRST. No real film → never fabricate.
  const metaCheck = validateFilmMetadata(film);
  if (!metaCheck.ok || !film) {
    return noFilm(metaCheck.warnings);
  }

  const spoilerLevel = toSpoilerLevel(opts.spoilerPreference);
  const grounded = buildGroundedMetadata(film);
  const filmMetadataHash = stableHash({
    id: film.id,
    title: film.title,
    year: film.year ?? null,
    director: film.director ?? null,
    language: film.filmLanguage ?? null,
    runtimeMinutes: film.runtimeMinutes ?? null,
    adminNote: film.adminNote ?? "",
  });
  const inputHash = stableHash({ filmMetadataHash, promptVersion: FILM_PROMPT_VERSION, lang: seg.emailLanguage, spoilerLevel });
  const allowFallback = opts.allowDeterministic ?? !isProd;

  if (geminiConfigured()) {
    const result = await generateJsonWithGemini(
      buildFilmUserPrompt(seg, film, spoilerLevel),
      FilmNoteSchema,
      {
        product: "one-film",
        task: "film-note",
        tier: "quality",
        system: FILM_SYSTEM_PROMPT,
        promptVersion: FILM_PROMPT_VERSION,
      },
    );

    if (result.ok) {
      const content = mapNote(result.data, film, grounded, seg.emailLanguage);
      const gate = runFilmGates(content, film, spoilerLevel, {
        subject: result.data.subject,
        previewText: result.data.previewText,
      });
      if (gate.ok) {
        return {
          title: film.title,
          subject: result.data.subject,
          previewText: (result.data.previewText || content.greeting || content.openingLine).slice(0, 140),
          content,
          generated: true,
          provider: "gemini",
          model: result.model,
          metadata: metaRecord({
            provider: "gemini",
            model: result.model,
            promptVersion: FILM_PROMPT_VERSION,
            inputHash,
            source: "ai",
            validationStatus: "VALID",
            warnings: mergeWarnings(metaCheck.warnings, gate.warnings),
            repaired: result.repaired,
          }, filmMetadataHash, metaCheck, spoilerLevel),
        };
      }
      console.error(`[film/generator] quality gate failed (${film.title}): ${gate.warnings.join(" | ")}`);
      if (allowFallback) return deterministic(film, grounded, seg.emailLanguage, inputHash, filmMetadataHash, metaCheck, spoilerLevel, "quality_gate_failed", gate.warnings);
    } else {
      console.error(`[film/generator] gemini failed: ${result.kind} — ${result.message}`);
      if (allowFallback) return deterministic(film, grounded, seg.emailLanguage, inputHash, filmMetadataHash, metaCheck, spoilerLevel, `${result.kind}: ${result.message}`);
    }

    return generationUnavailable(film, inputHash, filmMetadataHash, metaCheck, spoilerLevel, "generation_failed");
  }

  // Gemini not configured.
  if (allowFallback) return deterministic(film, grounded, seg.emailLanguage, inputHash, filmMetadataHash, metaCheck, spoilerLevel, "gemini_not_configured");
  return generationUnavailable(film, inputHash, filmMetadataHash, metaCheck, spoilerLevel, "ai_unavailable_in_production");
}

/* ----------------------------------------------------------------------- */
/* Mapping (validated commentary + grounded metadata → stored content)      */
/* ----------------------------------------------------------------------- */

function buildGroundedMetadata(film: FilmCatalogEntry): FilmIssueContent["metadata"] {
  const meta: NonNullable<FilmIssueContent["metadata"]> = {};
  if (film.year != null) meta.year = film.year;
  if (film.director) meta.director = film.director;
  if (film.filmLanguage) meta.language = film.filmLanguage;
  if (film.runtimeMinutes != null) meta.runtimeMinutes = film.runtimeMinutes;
  // whereToWatch is intentionally never set — availability is never invented.
  return Object.keys(meta).length > 0 ? meta : undefined;
}

function mapNote(
  d: FilmNoteValidated,
  film: FilmCatalogEntry,
  grounded: FilmIssueContent["metadata"],
  lang: string,
): FilmIssueContent {
  const tr = lang === "Turkish";
  return {
    greeting: d.greeting || (tr ? "Bu akşam için kısa bir film notu." : "A short film note for tonight."),
    openingLine: d.openingLine || (tr ? "İzlemeye değer tek bir film." : "One film worth thinking about tonight."),
    filmTitle: film.title, // verbatim from catalog — never the model
    whyThisFilm: d.whyThisFilm,
    whatItFeelsLike: d.whatItFeelsLike,
    bestWatchedWhen: d.bestWatchedWhen,
    beforeYouPressPlay: d.beforeYouPressPlay,
    spoilerNote: d.spoilerNote || (tr ? "Spoiler içermez — sürprizler saklı." : "Spoiler-light — no twists revealed."),
    metadata: grounded,
  };
}

/* ----------------------------------------------------------------------- */
/* Deterministic grounded fallback (uses ONLY admin note + grounded meta)   */
/* ----------------------------------------------------------------------- */

function deterministic(
  film: FilmCatalogEntry,
  grounded: FilmIssueContent["metadata"],
  lang: string,
  inputHash: string,
  filmMetadataHash: string,
  metaCheck: ReturnType<typeof validateFilmMetadata>,
  spoilerLevel: SpoilerLevel,
  error: string,
  extraWarnings: string[] = [],
): GeneratedFilmIssue {
  const tr = lang === "Turkish";
  const note = (film.adminNote ?? "").trim();
  const content: FilmIssueContent = {
    greeting: tr ? "Bu akşam için kısa bir film notu." : "A short film note for tonight.",
    openingLine: tr ? "İzlemeye değer tek bir film." : "One film worth thinking about tonight.",
    filmTitle: film.title,
    whyThisFilm: note || (tr ? `Düşünmeye değer bir öneri: ${film.title}.` : `A thoughtful recommendation: ${film.title}.`),
    whatItFeelsLike: "",
    bestWatchedWhen: "",
    beforeYouPressPlay: "",
    spoilerNote: tr ? "Spoiler içermez — sürprizler saklı." : "Spoiler-light — no twists revealed.",
    metadata: grounded,
  };
  return {
    title: film.title,
    subject: tr ? `Bu akşamın OneFilm notu: ${film.title}` : `Tonight's OneFilm: ${film.title}`,
    previewText: tr ? "Daha sakin bir akşam için tek bir film notu." : "One thoughtful film note, made for a calmer evening.",
    content,
    generated: true,
    provider: "deterministic",
    model: "deterministic",
    metadata: metaRecord({
      provider: "deterministic",
      model: "deterministic",
      promptVersion: FILM_PROMPT_VERSION,
      inputHash,
      source: "deterministic",
      validationStatus: "SKIPPED",
      warnings: mergeWarnings(metaCheck.warnings, extraWarnings),
      error,
    }, filmMetadataHash, metaCheck, spoilerLevel),
  };
}

/* ----------------------------------------------------------------------- */
/* Non-generation results                                                    */
/* ----------------------------------------------------------------------- */

function noFilm(warnings: string[]): GeneratedFilmIssue {
  return {
    title: "Tonight's film note",
    subject: "OneFilm: one film worth thinking about",
    previewText: "",
    content: emptyContent(),
    generated: false,
    reason: "NO_FILM",
    provider: null,
    model: null,
    metadata: {
      ...(buildGenerationMeta({
        provider: null,
        model: null,
        promptVersion: FILM_PROMPT_VERSION,
        inputHash: "",
        source: "none",
        validationStatus: "SKIPPED",
        warnings: warnings.length ? warnings : undefined,
        error: "no_film_available",
      }) as unknown as Record<string, unknown>),
      filmMetadataHash: "",
    },
  };
}

function generationUnavailable(
  film: FilmCatalogEntry,
  inputHash: string,
  filmMetadataHash: string,
  metaCheck: ReturnType<typeof validateFilmMetadata>,
  spoilerLevel: SpoilerLevel,
  error: string,
): GeneratedFilmIssue {
  return {
    title: "Tonight's film note",
    subject: "OneFilm: one film worth thinking about",
    previewText: "",
    content: emptyContent(),
    generated: false,
    reason: "GENERATION_UNAVAILABLE",
    provider: "gemini",
    model: null,
    metadata: metaRecord({
      provider: "gemini",
      model: null,
      promptVersion: FILM_PROMPT_VERSION,
      inputHash,
      source: "none",
      validationStatus: "SKIPPED",
      error,
    }, filmMetadataHash, metaCheck, spoilerLevel),
  };
}

/* ----------------------------------------------------------------------- */
/* Helpers                                                                   */
/* ----------------------------------------------------------------------- */

/** Provenance bag with OneFilm-specific metadata-grounding fields. */
function metaRecord(
  partial: Parameters<typeof buildGenerationMeta>[0],
  filmMetadataHash: string,
  metaCheck: ReturnType<typeof validateFilmMetadata>,
  spoilerLevel: SpoilerLevel,
): Record<string, unknown> {
  return {
    ...(buildGenerationMeta(partial) as unknown as Record<string, unknown>),
    filmMetadataHash,
    spoilerLevel,
    metadataProvided: metaCheck.provided,
    metadataMissing: metaCheck.missing,
  };
}

function mergeWarnings(a: string[], b: string[]): string[] | undefined {
  const all = [...a, ...b].filter(Boolean);
  return all.length ? all : undefined;
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
