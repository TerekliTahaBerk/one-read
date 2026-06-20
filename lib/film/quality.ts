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

/**
 * Lowercase + fold for matching. Turkish "İ" (U+0130) lowercases in JS to
 * "i" + COMBINING DOT ABOVE (U+0307); strip that combining dot so markers
 * written with a normal "i" still match (e.g. "IMDb" / "İmdb").
 */
function foldForMatch(s: string): string {
  return s.toLowerCase().normalize("NFC").replace(/̇/g, "");
}

/** Listicle / content-farm / fake-critic / hype phrasing OneFilm must avoid (TR + EN). */
const FORBIDDEN_TONE = [
  // English
  "top 10",
  "top ten",
  "top 5",
  "best movies",
  "must-watch",
  "must watch",
  "you have to see",
  "critics agree",
  "critics are raving",
  "critically acclaimed",
  "universally acclaimed",
  "hidden gem",
  "cinematic masterpiece",
  "masterpiece",
  "unforgettable journey",
  "rollercoaster",
  "edge of your seat",
  "perfect movie night",
  "perfect for movie night",
  "award-winning",
  "rotten tomatoes",
  "imdb",
  "metacritic",
  "box office",
  "oscar winner",
  "oscar-winning",
  "academy award",
  "as an ai",
  // Turkish
  "mutlaka izlenmeli",
  "mutlaka izleyin",
  "saklı cevher",
  "sakli cevher",
  "başyapıt",
  "basyapit",
  "nefes kesici",
  "koltuğa çivileyen",
  "koltuga civileyen",
  "unutulmaz yolculuk",
  "ödüllü",
  "odullu",
];

/** Words that usually signal an invented availability/rating/award claim (TR + EN). */
const UNSUPPORTED_FACT_HINTS = [
  // English
  "now streaming",
  "available on",
  "streaming on",
  "streaming now",
  "watch it on",
  "netflix",
  "hulu",
  "disney+",
  "disney plus",
  "amazon prime",
  "prime video",
  "hbo",
  "apple tv",
  "rated ",
  "rating of",
  "stars out of",
  "/10",
  "won the",
  "nominated for",
  "grossed",
  // Turkish
  "yayında",
  "yayinda",
  "üzerinden izleyebilir",
  "izleyebilirsiniz",
  "imdb puanı",
  "imdb puani",
  "oscar kazandı",
  "oscar kazandi",
  "ödül kazandı",
  "odul kazandi",
  "gişe",
  "gise hasilati",
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
  const commentary = foldForMatch(
    [
      content.greeting ?? "",
      content.openingLine,
      content.whyThisFilm,
      content.whatItFeelsLike,
      content.bestWatchedWhen,
      content.beforeYouPressPlay,
    ].join(" \n "),
  );

  // Tone scan also covers the inbox-facing subject/preheader so a listicle
  // subject ("Top 10…") is caught too.
  const toneBlob = foldForMatch(`${display.subject ?? ""} \n ${display.previewText ?? ""} \n ${commentary}`);

  // Listicle / content-farm / fake-critic / hype tone (fold-aware, TR + EN).
  // "hidden gem" / "saklı cevher" are allowed only when the admin note supports them.
  const adminBlob = foldForMatch(film.adminNote ?? "");
  for (const phrase of FORBIDDEN_TONE) {
    const folded = foldForMatch(phrase);
    if (!toneBlob.includes(folded)) continue;
    const adminSupported =
      (folded === foldForMatch("hidden gem") || folded === foldForMatch("saklı cevher")) &&
      (adminBlob.includes(foldForMatch("hidden gem")) || adminBlob.includes(foldForMatch("saklı cevher")));
    if (adminSupported) continue;
    findings.push({ severity: "error", code: "content_farm_tone", field: "commentary", message: `Content-farm / fake-critic / hype phrasing ("${phrase}").` });
  }

  // Unsupported availability / ratings / awards claims. Allowed only if the
  // exact token actually appears in the provided admin metadata (rare).
  for (const hint of UNSUPPORTED_FACT_HINTS) {
    const folded = foldForMatch(hint);
    if (commentary.includes(folded) && !adminBlob.includes(folded)) {
      findings.push({ severity: "error", code: "unsupported_fact", field: "commentary", message: `Possible invented fact/availability/rating ("${hint.trim()}") not in provided metadata.` });
    }
  }

  // Director invention: commentary names "directed by" / "yönetmen(liğini)" but
  // metadata lacks a director.
  if (!film.director && /\bdirected by\b/i.test(commentary)) {
    findings.push({ severity: "error", code: "invented_director", field: "commentary", message: "Mentions a director but none was provided in metadata." });
  }
  if (!film.director && /yönetmen|yonetmen/i.test(commentary)) {
    findings.push({ severity: "warning", code: "possible_invented_director", field: "commentary", message: "Mentions a director (yönetmen) but none was provided in metadata." });
  }
  if (film.year == null && /\b(19|20)\d{2}\b/.test(commentary)) {
    findings.push({ severity: "warning", code: "possible_invented_year", field: "commentary", message: "Mentions a year-like number but no year was provided." });
  }

  // Spoiler level respected: in spoiler-free/light, flag explicit spoiler/ending
  // talk (TR + EN).
  if (spoilerLevel !== "analysis") {
    const spoilerEn = /\b(the ending|the final scene|the twist|twist ending|dies|killer is|turns out that|reveals that)\b/i;
    const spoilerTr = /(sonunda ortaya çık|final sahnesi|filmin sonu|sürpriz son|katil(in| )|aslında .* olduğu ortaya|gerçek kimliği)/i;
    if (spoilerEn.test(commentary) || spoilerTr.test(commentary)) {
      findings.push({ severity: "error", code: "spoiler_violation", field: "commentary", message: `Spoiler-ish content present while spoiler level is "${spoilerLevel}".` });
    }
  }

  return toReport(findings);
}
