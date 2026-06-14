/**
 * One Read — article candidate ingestion.
 *
 * The ingestion layer is intentionally pluggable. The pipeline calls
 * `ingestCandidates(date)` and gets back zero or more articles to score
 * and consider for daily picks. Sources can be RSS feeds, an internal
 * editorial queue, an AI agent that crawls + summarizes, etc.
 *
 * The default `noopSource` returns nothing — useful as a safe default in
 * environments without ingestion configured. Replace it (or compose
 * multiple sources) by exporting a different `defaultIngestionPipeline`.
 */

import { createHash } from "node:crypto";
import type { Article } from "@prisma/client";
import { prisma } from "./prisma";
import { canonicalizeUrl } from "./url-canonical";

export interface CandidateInput {
  url: string;
  title: string;
  sourceName: string;
  sourceLanguage: string;
  topic: string;
  subtopics?: readonly string[];
  tags?: readonly string[];
  publishedAt?: Date;
  qualityScore?: number;
  usefulnessScore?: number;
  morningReadScore?: number;
  difficulty?: string;
  rawExcerpt?: string;
  reasonForSelection?: string;
}

export interface IngestionSource {
  /** Human-readable name, shown in the admin preview. */
  name: string;
  /** Returns candidate articles for the given UTC date. */
  fetch(date: Date): Promise<readonly CandidateInput[]>;
}

/**
 * The default no-op source. Returns an empty list so the pipeline runs
 * cleanly even without any configured ingestion provider.
 */
export const noopSource: IngestionSource = {
  name: "noop",
  async fetch() {
    return [];
  },
};

/**
 * Run all sources, dedupe by URL, and persist any new ones into `Article`.
 * Returns the persisted Article rows so the caller can score + rank.
 */
export async function ingestCandidates(
  date: Date,
  sources: readonly IngestionSource[] = [noopSource],
): Promise<Article[]> {
  // Fan-out to every source, collect raw candidates.
  const collected: CandidateInput[] = [];
  for (const src of sources) {
    try {
      const items = await src.fetch(date);
      collected.push(...items);
    } catch (err) {
      console.error(
        `[ingest] source "${src.name}" failed:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  if (collected.length === 0) return [];

  // Normalize each candidate to a canonical URL + title hash. These are
  // the three dedupe keys: exact url, canonical url, and normalized title.
  type Normalized = CandidateInput & { canonicalUrl: string; titleHash: string };
  const normalized: Normalized[] = [];
  for (const c of collected) {
    if (!c.url) continue;
    const canonicalUrl = canonicalizeUrl(c.url) ?? c.url;
    normalized.push({ ...c, canonicalUrl, titleHash: titleHash(c.title) });
  }

  // In-batch dedupe — first occurrence wins across canonical url + title.
  const seenCanonical = new Set<string>();
  const seenTitle = new Set<string>();
  const unique: Normalized[] = [];
  for (const c of normalized) {
    if (seenCanonical.has(c.canonicalUrl) || seenTitle.has(c.titleHash)) continue;
    seenCanonical.add(c.canonicalUrl);
    seenTitle.add(c.titleHash);
    unique.push(c);
  }

  // Cross-run dedupe — drop candidates that already exist in the DB by
  // url, canonical url, or a recent identical title. "Duplicate article
  // already exists" is a rejection rule we apply before persisting so we
  // never create near-duplicate rows.
  const existingUrls = new Set<string>();
  const existingTitles = new Set<string>();
  try {
    const since = new Date(Date.now() - DEDUPE_TITLE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const urls = unique.map((c) => c.canonicalUrl);
    const existing = await prisma.article.findMany({
      where: {
        OR: [
          { url: { in: urls } },
          { canonicalUrl: { in: urls } },
          { ingestedAt: { gte: since } },
        ],
      },
      select: { url: true, canonicalUrl: true, title: true, ingestedAt: true },
    });
    for (const e of existing) {
      existingUrls.add(e.url);
      if (e.canonicalUrl) existingUrls.add(e.canonicalUrl);
      if (e.ingestedAt >= since) existingTitles.add(titleHash(e.title));
    }
  } catch (err) {
    // If the lookup fails we fall back to the unique-constraint upsert
    // below rather than aborting the whole ingest.
    console.warn(
      "[ingest] dedupe pre-check failed, relying on unique constraints:",
      err instanceof Error ? err.message : err,
    );
  }

  // Upsert each one. We intentionally leave existing rows alone so we
  // don't overwrite editorial scores set elsewhere.
  const persisted: Article[] = [];
  for (const c of unique) {
    if (existingUrls.has(c.canonicalUrl) || existingTitles.has(c.titleHash)) {
      continue; // already ingested under a different surface — skip.
    }
    const article = await prisma.article.upsert({
      where: { url: c.url },
      update: {},
      create: {
        url: c.url,
        canonicalUrl: c.canonicalUrl,
        title: c.title,
        sourceName: c.sourceName,
        sourceLanguage: c.sourceLanguage,
        topic: c.topic,
        subtopics: [...(c.subtopics ?? [])],
        tags: [...(c.tags ?? [])],
        publishedAt: c.publishedAt ?? null,
        qualityScore: clamp01(c.qualityScore ?? 0),
        usefulnessScore: clamp01(c.usefulnessScore ?? 0),
        morningReadScore: clamp01(c.morningReadScore ?? 0),
        difficulty: c.difficulty ?? "mixed",
        rawExcerpt: c.rawExcerpt ?? null,
        reasonForSelection: c.reasonForSelection ?? null,
      },
    });
    persisted.push(article);
  }

  return persisted;
}

/** Articles ingested within this window are dedupe-checked by title. */
const DEDUPE_TITLE_WINDOW_DAYS = 14;

/**
 * Stable hash of a normalized title. Lowercased, punctuation-stripped,
 * whitespace-collapsed so trivially different titles ("Foo — Bar" vs.
 * "foo bar") collapse to the same key.
 */
function titleHash(title: string): string {
  const normalized = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  return createHash("sha1").update(normalized).digest("hex");
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}
