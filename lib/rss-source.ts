/**
 * OneRead — RSS / Atom ingestion source.
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
const MAX_FEED_BYTES = 5_000_000;
const MAX_AGE_DAYS = 7;

const USER_AGENT =
  "OneReadBot/1.0 (+https://oneread.app/about/bot; editorial summarizer; contact: hello@oneread.app)";

const parser = new Parser<{ language?: string }, FeedItem>({
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
        const feed = await fetchFeed(src.feedUrl);

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
  // updateMany deliberately treats a concurrently deleted/fallback seed row
  // as a no-op. `update` throws P2025 (and Prisma logs it before our catch).
  try {
    await prisma.source.updateMany({
      where: { slug },
      data: { lastFetchedAt: new Date(), lastError: null },
    });
  } catch {
    // Observability writes must never turn a successfully fetched feed into
    // an ingestion failure (for example during a transient DB outage).
  }
}

async function markSourceError(slug: string, msg: string): Promise<void> {
  try {
    await prisma.source.updateMany({
      where: { slug },
      data: { lastFetchedAt: new Date(), lastError: msg.slice(0, 500) },
    });
  } catch {
    // The original feed error was already logged; do not mask it with a
    // secondary failure while persisting diagnostics.
  }
}

/** Fetch separately from rss-parser's legacy parseURL implementation, which
 * uses Node's deprecated `url.parse()`. This also gives feeds explicit HTTP
 * status and response-size handling. */
async function fetchFeed(feedUrl: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);

  try {
    const response = await fetch(feedUrl, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/rss+xml,application/atom+xml,application/xml,text/xml",
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const declaredSize = Number(response.headers.get("content-length"));
    if (Number.isFinite(declaredSize) && declaredSize > MAX_FEED_BYTES) {
      throw new Error(`feed response too large (${declaredSize} bytes)`);
    }

    const body = await readTextWithCap(response, MAX_FEED_BYTES);
    if (body === null) throw new Error(`feed response exceeds ${MAX_FEED_BYTES} bytes`);
    return parser.parseString(body);
  } finally {
    clearTimeout(timer);
  }
}

async function readTextWithCap(response: Response, maxBytes: number): Promise<string | null> {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let received = 0;
  let text = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (!value) continue;
    received += value.byteLength;
    if (received > maxBytes) {
      await reader.cancel();
      return null;
    }
    text += decoder.decode(value, { stream: true });
  }
  return text + decoder.decode();
}
