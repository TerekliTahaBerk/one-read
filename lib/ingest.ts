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

import type { Article } from "@prisma/client";
import { prisma } from "./prisma";

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

  // Dedupe by URL — first occurrence wins.
  const seen = new Set<string>();
  const unique: CandidateInput[] = [];
  for (const c of collected) {
    if (!c.url || seen.has(c.url)) continue;
    seen.add(c.url);
    unique.push(c);
  }

  // Upsert each one. We intentionally leave existing rows alone so we
  // don't overwrite editorial scores set elsewhere.
  const persisted: Article[] = [];
  for (const c of unique) {
    const article = await prisma.article.upsert({
      where: { url: c.url },
      update: {},
      create: {
        url: c.url,
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

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}
