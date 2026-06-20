/**
 * OneRead — OneFilm quality gates + metadata validation.
 *
 * OneFilm writes original commentary but must never invent film facts. Grounding
 * is enforced twice:
 *  1. validateFilmMetadata() — before generation, refuse when no real film
 *     exists (NO_FILM). A film needs at least a title.
 *  2. runFilmGates() — after generation, catch invented facts/availability/
 *     ratings/awards, listicle/content-farm/fake-critic tone, banned phrases,
 *     markdown/JSON leak, empty required sections, and spoiler-level violations.
 */

import type { FilmCatalogEntry } from "@prisma/client";
import {
  runEditorialPolishGates,
  runSharedGates,
  toReport,
  requireNonEmpty,
  type GateFinding,
  type GateReport,
} from "@/lib/ai";
import type { FilmIssueContent } from "./types";
import type { SpoilerLevel } from "./prompts";

/** Listicle / content-farm / fake-critic phrasing OneFilm must avoid. */
const FORBIDDEN_TONE = [
  "top 10",
  "top ten",
  "top 5",
  "best movies",
  "must-watch",
  "must watch",
  "you have to see",
  "critics agree",
  "critics are raving",
  "universally acclaimed",
  "rotten tomatoes",
  "imdb",
  "metacritic",
  "box office",
  "oscar winner",
  "oscar-winning",
  "academy award",
];

/** Words that usually signal an invented availability/rating/award claim. */
const UNSUPPORTED_FACT_HINTS = [
  "now streaming",
  "available on",
  "streaming on",
  "watch it on",
  "netflix",
  "hulu",
  "disney+",
  "disney plus",
  "amazon prime",
  "prime video",
  "hbo",
  "max",
  "apple tv",
  "rated ",
  "rating of",
  "stars out of",
  "/10",
  "won the",
  "nominated for",
  "grossed",
];

export interface FilmMetadataCheck {
  ok: boolean;
  reason?: string;
  /** Which factual fields are actually present (for admin completeness view). */
  provided: string[];
  missing: string[];
  warnings: string[];
}

/** Factual fields we track for completeness/grounding. */
const FACT_FIELDS = ["title", "year", "director", "filmLanguage", "runtimeMinutes"] as const;

export function validateFilmMetadata(film: FilmCatalogEntry | null): FilmMetadataCheck {
  if (!film || !film.title?.trim()) {
    return { ok: false, reason: "NO_FILM", provided: [], missing: [...FACT_FIELDS], warnings: ["No film metadata available."] };
  }
  const provided: string[] = [];
  const missing: string[] = [];
  for (const f of FACT_FIELDS) {
    const v = (film as Record<string, unknown>)[f];
    if (v == null || (typeof v === "string" && !v.trim())) missing.push(f);
    else provided.push(f);
  }
  const warnings = missing.length
    ? [`Missing factual metadata: ${missing.join(", ")} — the note must omit these, not invent them.`]
    : [];
  return { ok: true, provided, missing, warnings };
}

/**
 * Post-generation gates. `film` is the grounded catalog entry; any factual claim
 * the commentary makes must be supported by it.
 */
export function runFilmGates(
  content: FilmIssueContent,
  film: FilmCatalogEntry,
  spoilerLevel: SpoilerLevel,
  display: { subject?: string; previewText?: string } = {},
): GateReport {
  const findings: GateFinding[] = [
    ...runSharedGates({ ...display, ...content }, { maxFieldLength: 900 }),
    ...runEditorialPolishGates({ ...display, ...content }, { product: "one-film" }),
  ];

  // Required commentary sections.
  findings.push(
    ...requireNonEmpty(content as unknown as Record<string, unknown>, ["whyThisFilm"]),
  );

  // Body commentary (excludes spoilerNote, which legitimately says "Spoiler-light…").
  const commentary = [
    content.openingLine,
    content.whyThisFilm,
    content.whatItFeelsLike,
    content.bestWatchedWhen,
    content.beforeYouPressPlay,
  ]
    .join(" \n ")
    .toLowerCase();

  // Listicle / content-farm / fake-critic tone.
  for (const phrase of FORBIDDEN_TONE) {
    if (commentary.includes(phrase)) {
      findings.push({ severity: "error", code: "content_farm_tone", field: "commentary", message: `Content-farm / fake-critic phrasing ("${phrase}").` });
    }
  }

  // Unsupported availability / ratings / awards claims. Allowed only if the
  // exact token actually appears in the provided metadata (rare).
  const providedBlob = `${film.adminNote ?? ""}`.toLowerCase();
  for (const hint of UNSUPPORTED_FACT_HINTS) {
    if (commentary.includes(hint) && !providedBlob.includes(hint)) {
      findings.push({ severity: "error", code: "unsupported_fact", field: "commentary", message: `Possible invented fact/availability/rating ("${hint.trim()}") not in provided metadata.` });
    }
  }

  // Director/year invention: if commentary names a 4-digit year or "directed by"
  // but metadata lacks that fact, flag it.
  if (!film.director && /\bdirected by\b/i.test(commentary)) {
    findings.push({ severity: "error", code: "invented_director", field: "commentary", message: "Mentions a director but none was provided in metadata." });
  }
  if (film.year == null && /\b(19|20)\d{2}\b/.test(commentary)) {
    findings.push({ severity: "warning", code: "possible_invented_year", field: "commentary", message: "Mentions a year-like number but no year was provided." });
  }

  // Spoiler level respected: in spoiler-free/light, flag explicit spoiler/ending talk.
  if (spoilerLevel !== "analysis") {
    if (/\b(the ending|the final scene|the twist|twist ending|dies|killer is|turns out that|reveals that)\b/i.test(commentary)) {
      findings.push({ severity: "error", code: "spoiler_violation", field: "commentary", message: `Spoiler-ish content present while spoiler level is "${spoilerLevel}".` });
    }
  }

  return toReport(findings);
}
