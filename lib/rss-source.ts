/**
 * One Read — RSS / Atom ingestion source.
 *
 * Reads enabled `Source` rows from the DB (falling back to
 * `ACTIVE_SEED_SOURCES` if the DB is empty), pulls each feed,
 * normalizes URLs, and returns deduped `CandidateInput`s.
 *
 * Per-feed errors are isolated: one broken feed never kills the run.
 * Source rows are updated with `lastFetchedAt` / `lastError` for
 * observability.
 */

import Parser from "rss-parser";
import { prisma } from "./prisma";
import { ACTIVE_SEED_SOURCES, type SourceConfig } from "./sources";
import { canonicalizeUrl } from "./url-canonical";
import { PER_SOURCE_CANDIDATE_LIMIT } from "./thresholds";
import type { CandidateInput, IngestionSource } from "./ingest";

interface FeedItem {
  link?: string;
  guid?: string;
  title?: string;
  contentSnippet?: string;
  content?: string;
  isoDate?: string;
  pubDate?: string;
  summary?: string;
}

const HTTP_TIMEOUT_MS = 12_000;
const MAX_AGE_DAYS = 7;

const USER_AGENT =
  "OneReadBot/1.0 (+https://oneread.app/about/bot; editorial summarizer; contact: hello@oneread.app)";

const parser = new Parser<{ language?: string }, FeedItem>({
  timeout: HTTP_TIMEOUT_MS,
  headers: { "User-Agent": USER_AGENT, Accept: "application/rss+xml,application/atom+xml,application/xml,text/xml" },
});

/* ----------------------------------------------------------------------- */
/* Public source                                                           */
/* ----------------------------------------------------------------------- */

export const rssSource: IngestionSource = {
  name: "rss",
  async fetch(): Promise<readonly CandidateInput[]> {
    const enabled = await loadEnabledSources();
    if (enabled.length === 0) return [];

    const cutoff = new Date(Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000);
    const seen = new Set<string>();
    const all: CandidateInput[] = [];

    // Fetch sequentially: feeds are individually rate-limit-friendly
    // and we want clean per-source error logs without bursts.
    for (const src of enabled) {
      try {
        const feed = await parser.parseURL(src.feedUrl);

        let kept = 0;
        for (const item of feed.items ?? []) {
          if (kept >= PER_SOURCE_CANDIDATE_LIMIT) break;
          const candidate = toCandidate(src, item, cutoff);
          if (!candidate) continue;
          const dedupeKey = candidate.url; // already canonical
          if (seen.has(dedupeKey)) continue;
          seen.add(dedupeKey);
          all.push(candidate);
          kept++;
        }

        await markSourceOk(src.slug);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[ingest/rss] "${src.slug}" failed: ${msg}`);
        await markSourceError(src.slug, msg);
      }
    }

    return all;
  },
};

/* ----------------------------------------------------------------------- */
/* Helpers                                                                 */
/* ----------------------------------------------------------------------- */

async function loadEnabledSources(): Promise<readonly SourceConfig[]> {
  // Prefer DB rows so admins can toggle without a deploy.
  try {
    const rows = await prisma.source.findMany({ where: { active: true } });
    if (rows.length > 0) {
      return rows.map((r) => ({
        slug: r.slug,
        name: r.name,
        feedUrl: r.feedUrl,
        homepage: r.homepage ?? undefined,
        defaultTopic: r.defaultTopic,
        defaultSubtopics: r.defaultSubtopics,
        language: (r.language as SourceConfig["language"]) ?? "English",
        active: r.active,
        notes: r.notes ?? undefined,
      }));
    }
  } catch (err) {
    console.warn(
      "[ingest/rss] could not read Source table, falling back to seed list:",
      err instanceof Error ? err.message : err,
    );
  }
  return ACTIVE_SEED_SOURCES;
}

function toCandidate(
  src: SourceConfig,
  item: FeedItem,
  cutoff: Date,
): CandidateInput | null {
  const rawUrl = item.link ?? item.guid;
  if (!rawUrl) return null;
  const canonical = canonicalizeUrl(rawUrl);
  if (!canonical) return null;

  const title = (item.title ?? "").trim();
  if (!title) return null;

  const publishedAt = parseDate(item.isoDate ?? item.pubDate);
  if (publishedAt && publishedAt < cutoff) return null;

  const excerpt = pickExcerpt(item);

  return {
    url: canonical,
    title,
    sourceName: src.name,
    sourceLanguage: src.language ?? "English",
    topic: src.defaultTopic,
    subtopics: src.defaultSubtopics ?? [],
    tags: [],
    publishedAt: publishedAt ?? undefined,
    rawExcerpt: excerpt,
  };
}

function pickExcerpt(item: FeedItem): string {
  const candidates = [item.contentSnippet, item.summary, item.content].filter(
    (s): s is string => typeof s === "string" && s.trim().length > 0,
  );
  if (candidates.length === 0) return "";
  // Strip basic HTML, collapse whitespace, soft-cap to ~600 chars.
  const cleaned = candidates[0]
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.length > 600 ? `${cleaned.slice(0, 600)}…` : cleaned;
}

function parseDate(s: string | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isFinite(d.getTime()) ? d : null;
}

async function markSourceOk(slug: string): Promise<void> {
  try {
    await prisma.source.update({
      where: { slug },
      data: { lastFetchedAt: new Date(), lastError: null },
    });
  } catch {
    /* row may not exist yet — fine. */
  }
}

async function markSourceError(slug: string, msg: string): Promise<void> {
  try {
    await prisma.source.update({
      where: { slug },
      data: { lastFetchedAt: new Date(), lastError: msg.slice(0, 500) },
    });
  } catch {
    /* row may not exist yet — fine. */
  }
}
