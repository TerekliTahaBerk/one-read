/**
 * OneRead — OneNews source sanitizer.
 *
 * OneNews is a sponsor-free morning brief. Source pages (especially Turkish
 * newsletter-style sources) frequently embed sponsor blocks, paid placements,
 * and sales/collaboration CTAs inline with real editorial content. This module
 * runs BEFORE the source bundle is handed to Gemini so sponsor copy never enters
 * the model input or the rendered email.
 *
 * Two layers:
 *  1. isSponsorStory()  — a whole story whose headline IS a sponsor block.
 *  2. stripSponsorText() — removes sponsor lines/phrases from an excerpt while
 *     preserving the surrounding real editorial text.
 *
 * It never removes real news just because ad copy sits near it on the page — it
 * only strips the sponsor lines themselves. When a story is purely a sponsor
 * block, the whole story is dropped.
 */

import type { NewsSourceStory } from "@prisma/client";

/**
 * Sponsor / paid-placement / sales markers. Case-insensitive. Turkish-first,
 * with a few common English equivalents. Used both to detect sponsor-only
 * stories and to strip sponsor lines from excerpts.
 */
export const SPONSOR_MARKERS: readonly string[] = [
  "bugünkü destekçimiz",
  "bugunku destekcimiz",
  "günün destekçisi",
  "sponsorlu",
  "sponsor",
  "günün önerileri",
  "gunun onerileri",
  "reklam",
  "i̇şbirliği",
  "işbirliği",
  "isbirligi",
  "rezervasyon",
  "sales@",
  "marka hikayelerinizi",
  "marka hikâyelerinizi",
  "hikâyeyi paylaşmak için",
  "hikayeyi paylasmak için",
  "detaylar için burayı ziyaret edebilirsiniz",
  "detaylar icin burayi ziyaret edebilirsiniz",
  "tanıtım",
  "tanitim",
  "advertorial",
  "promoted",
  "paid partnership",
  "this is a paid",
];

/**
 * Heading-like sponsor markers — when a story's headline matches one of these
 * the entire story is a sponsor block and must be dropped from the bundle.
 */
const SPONSOR_HEADINGS: readonly string[] = [
  "bugünkü destekçimiz",
  "bugunku destekcimiz",
  "günün destekçisi",
  "sponsorlu",
  "günün önerileri",
  "gunun onerileri",
  "reklam",
  "advertorial",
  "promoted",
  "paid partnership",
];

/**
 * Lowercase + fold for matching. Turkish "İ" (U+0130) lowercases in JS to
 * "i" + COMBINING DOT ABOVE (U+0307), which would break naive substring matches
 * (e.g. "destekçİmİz" → "destekçi̇mi̇z"). We strip that combining dot so sponsor
 * markers written with a normal "i" still match. Other Turkish letters
 * (ü/ö/ç/ş/ğ) are precomposed and unaffected.
 */
export function foldForMatch(s: string): string {
  return s.toLowerCase().normalize("NFC").replace(/̇/g, "");
}

/**
 * Words that contain a sponsor marker as a substring but mean the OPPOSITE
 * (sponsor-free copy, e.g. "reklamsız" = ad-free). These must never be treated
 * as sponsor hits. Removed from the folded text before marker scanning.
 */
const ANTI_MARKERS = ["reklamsız", "reklamsiz", "reklam yok", "reklamdan arınmış", "reklamsız."];

/** Returns the first sponsor marker present in `text`, or null. Fold-aware. */
export function findSponsorMarker(text: string): string | null {
  let folded = foldForMatch(text);
  for (const anti of ANTI_MARKERS) folded = folded.split(anti).join(" ");
  for (const m of SPONSOR_MARKERS) {
    if (folded.includes(foldForMatch(m))) return m;
  }
  return null;
}

function normalize(s: string): string {
  return foldForMatch(s);
}

/** True when this whole story is a sponsor/paid-placement block (drop it). */
export function isSponsorStory(
  story: Pick<NewsSourceStory, "headline" | "excerpt">,
): boolean {
  const raw = story.headline ?? "";
  if (!raw.trim()) return false;
  let headline = normalize(raw);
  for (const anti of ANTI_MARKERS) headline = headline.split(anti).join(" ");
  for (const h of SPONSOR_HEADINGS) {
    if (headline.includes(normalize(h))) return true;
  }
  // A "headline" that is itself a sales CTA / contact line.
  if (/sales@/.test(headline) && headline.includes("sponsor")) {
    return true;
  }
  return false;
}

/**
 * Remove sponsor lines/phrases from a block of text while preserving the real
 * editorial sentences around them. Splits on line breaks AND sentence-ish
 * boundaries so a single sponsor sentence inside a paragraph can be dropped.
 */
export function stripSponsorText(input: string | null | undefined): string {
  if (!input) return "";
  const lines = input.split(/\r?\n/);
  const kept = lines
    .flatMap((line) => splitSentences(line))
    .filter((chunk) => {
      if (!chunk.trim()) return false;
      return findSponsorMarker(chunk) === null;
    });
  return kept.join(" ").replace(/\s{2,}/g, " ").trim();
}

function splitSentences(line: string): string[] {
  // Keep it simple: split on sentence terminators followed by whitespace.
  return line
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export interface SanitizeResult {
  /** Stories safe to brief from (sponsor-only stories dropped, excerpts cleaned). */
  clean: NewsSourceStory[];
  /** Number of whole stories dropped because they were sponsor blocks. */
  droppedSponsorCount: number;
  /** Number of stories whose excerpt had sponsor text stripped (but kept). */
  cleanedExcerptCount: number;
  warnings: string[];
}

/**
 * Sanitize a list of source stories before they become a OneNews source bundle.
 * Drops sponsor-only stories and strips sponsor lines from the remaining
 * excerpts. Never invents or reorders editorial content.
 */
export function sanitizeSourceStories(
  stories: NewsSourceStory[],
): SanitizeResult {
  const warnings: string[] = [];
  let droppedSponsorCount = 0;
  let cleanedExcerptCount = 0;

  const clean: NewsSourceStory[] = [];
  for (const story of stories) {
    if (isSponsorStory(story)) {
      droppedSponsorCount++;
      warnings.push(`Dropped sponsor block "${story.headline}".`);
      continue;
    }
    const original = story.excerpt ?? "";
    const stripped = stripSponsorText(original);
    if (stripped !== original.trim()) {
      cleanedExcerptCount++;
    }
    clean.push({ ...story, excerpt: stripped || null });
  }

  return { clean, droppedSponsorCount, cleanedExcerptCount, warnings };
}
