/**
 * OneRead — readability-style article extractor.
 *
 * Public web articles only. We respect robots conventions in spirit:
 *   - polite User-Agent, includes contact URL
 *   - no JS execution, no anti-bot bypass, no paywall circumvention
 *   - hard timeouts, hard size limits, never retried aggressively
 *
 * If extraction fails or yields too little content, we fall back to the
 * RSS excerpt and mark `extractionConfidence` low. Articles below
 * `MIN_EXTRACTION_CONFIDENCE` are downgraded but not deleted.
 */

import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import {
  MAX_CLEANED_TEXT_LENGTH,
  MIN_CLEANED_TEXT_LENGTH,
} from "./thresholds";

export interface ExtractionResult {
  title: string | null;
  cleanedText: string | null;
  excerpt: string | null;
  confidence: number;
  reason?: string;
}

const HTTP_TIMEOUT_MS = 10_000;
const MAX_BYTES = 1_500_000;

const USER_AGENT =
  "OneReadBot/1.0 (+https://oneread.app/about/bot; editorial summarizer; contact: hello@oneread.app)";

/**
 * Politely fetch + readability-extract a public article.
 * Never throws; returns a confidence < `MIN_EXTRACTION_CONFIDENCE`
 * for any failure case so callers can fall back to RSS metadata.
 */
export async function extractArticle(url: string): Promise<ExtractionResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9,tr;q=0.8",
      },
    });

    if (!res.ok) {
      return failure(`HTTP ${res.status}`);
    }
    const ct = res.headers.get("content-type") ?? "";
    if (!/text\/html|application\/xhtml/i.test(ct)) {
      return failure(`non-html content-type: ${ct}`);
    }

    // Read with a hard byte cap to avoid pathological pages.
    const buf = await readWithCap(res, MAX_BYTES);
    if (!buf) return failure("response too large");
    const html = buf.toString("utf-8");

    // Cheap paywall heuristic: if the body is dominated by paywall
    // markers, we skip extraction rather than store half-content.
    if (looksPaywalled(html)) return failure("looks paywalled");

    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const parsed = reader.parse();

    if (!parsed) return failure("readability returned null");

    const cleaned = clamp(parsed.textContent?.trim() ?? "");
    const excerpt = (parsed.excerpt ?? "").trim() || cleaned.slice(0, 240);

    if (cleaned.length < MIN_CLEANED_TEXT_LENGTH) {
      return {
        title: parsed.title?.trim() ?? null,
        cleanedText: null,
        excerpt: excerpt || null,
        confidence: 0.2,
        reason: `cleaned text too short (${cleaned.length} chars)`,
      };
    }

    // Confidence heuristic: long, prose-like, balanced punctuation.
    const confidence = scoreConfidence(cleaned);

    return {
      title: parsed.title?.trim() ?? null,
      cleanedText: cleaned,
      excerpt: excerpt || cleaned.slice(0, 280),
      confidence,
    };
  } catch (err) {
    return failure(
      err instanceof Error ? err.message : "unknown extraction error",
    );
  } finally {
    clearTimeout(timer);
  }
}

/* ----------------------------------------------------------------------- */
/* Helpers                                                                 */
/* ----------------------------------------------------------------------- */

function failure(reason: string): ExtractionResult {
  return {
    title: null,
    cleanedText: null,
    excerpt: null,
    confidence: 0,
    reason,
  };
}

function clamp(text: string): string {
  // Collapse runs of whitespace, hard-cap length.
  const collapsed = text.replace(/[\s\u00A0]+/g, " ").trim();
  return collapsed.length > MAX_CLEANED_TEXT_LENGTH
    ? collapsed.slice(0, MAX_CLEANED_TEXT_LENGTH)
    : collapsed;
}

/**
 * Confidence heuristic for a block of already-clean text. Exported so the
 * scorer can assess manually-supplied / demo article bodies (which never
 * go through the network fetch) on the same scale as extracted text.
 */
export function assessTextConfidence(text: string): number {
  return scoreConfidence(text);
}

function scoreConfidence(text: string): number {
  // Length contribution: tops out at ~6000 chars.
  const lengthScore = Math.min(1, text.length / 6000);
  // Punctuation density (sentences per 1000 chars).
  const sentenceish = text.match(/[.!?](\s|$)/g) ?? [];
  const sentenceDensity = Math.min(
    1,
    (sentenceish.length / Math.max(text.length, 1)) * 1000 / 12,
  );
  // Penalize "all caps" or "promo" artifacts.
  const upperRatio =
    text.replace(/[^A-Z]/g, "").length / Math.max(text.length, 1);
  const promoPenalty = upperRatio > 0.18 ? 0.5 : 1;

  return Math.max(0, Math.min(1, (0.6 * lengthScore + 0.4 * sentenceDensity) * promoPenalty));
}

function looksPaywalled(html: string): boolean {
  const lower = html.toLowerCase();
  const markers = [
    "subscribe to keep reading",
    "this article is for subscribers",
    "to continue reading, subscribe",
    "this content is exclusive",
    "premium content",
    "for subscribers only",
  ];
  let hits = 0;
  for (const m of markers) if (lower.includes(m)) hits++;
  return hits >= 2;
}

async function readWithCap(res: Response, max: number): Promise<Buffer | null> {
  if (!res.body) return null;
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (!value) continue;
    received += value.byteLength;
    if (received > max) return null;
    chunks.push(value);
  }
  return Buffer.concat(chunks.map((c) => Buffer.from(c)));
}
