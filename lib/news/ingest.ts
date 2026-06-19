import Parser from "rss-parser";
import { prisma } from "@/lib/prisma";
import { newsAllowedSources, newsSourceMode } from "./config";

/**
 * Optional RSS ingestion for OneNews. Only runs when ONENEWS_SOURCE_MODE=rss
 * and ONENEWS_ALLOWED_SOURCES lists feed URLs. We store the feed-provided
 * title + short excerpt + canonical link only — never full article text, and
 * never anything fabricated. Manual mode is the default and safest for launch.
 */

export interface IngestOptions {
  /** Briefing day (UTC midnight). Stories are dated to this day. */
  date: Date;
  /** Language tag to stamp ("English" | "Turkish"). */
  language?: string;
  /** Topic to stamp (best-effort; admin can re-categorize). */
  topic?: string;
  /** Region to stamp. */
  region?: string;
  /** Max items per feed. */
  perFeedLimit?: number;
}

export interface IngestResult {
  mode: "manual" | "rss";
  feeds: number;
  ingested: number;
  skipped: number;
  errors: { feed: string; error: string }[];
}

const parser = new Parser({ timeout: 15000 });

export async function ingestNewsSources(
  opts: IngestOptions,
): Promise<IngestResult> {
  const mode = newsSourceMode();
  if (mode !== "rss") {
    return { mode, feeds: 0, ingested: 0, skipped: 0, errors: [] };
  }

  const feeds = newsAllowedSources();
  let ingested = 0;
  let skipped = 0;
  const errors: { feed: string; error: string }[] = [];

  for (const feedUrl of feeds) {
    try {
      const feed = await parser.parseURL(feedUrl);
      const sourceName = feed.title?.trim() || hostname(feedUrl);
      const items = (feed.items ?? []).slice(0, opts.perFeedLimit ?? 6);
      for (const item of items) {
        const url = (item.link ?? "").trim();
        const headline = (item.title ?? "").trim();
        if (!url || !headline) {
          skipped++;
          continue;
        }
        const existing = await prisma.newsSourceStory.findFirst({
          where: { sourceUrl: url, storyDate: opts.date },
          select: { id: true },
        });
        if (existing) {
          skipped++;
          continue;
        }
        await prisma.newsSourceStory.create({
          data: {
            headline,
            sourceName,
            sourceUrl: url,
            // Excerpt only — never the full content.
            excerpt: clip(item.contentSnippet ?? item.summary ?? "", 400),
            topic: opts.topic ?? "world",
            region: opts.region ?? "Global",
            language: opts.language ?? "English",
            storyDate: opts.date,
            createdBy: "rss-ingest",
          },
        });
        ingested++;
      }
    } catch (err) {
      errors.push({ feed: feedUrl, error: errMsg(err) });
    }
  }

  return { mode, feeds: feeds.length, ingested, skipped, errors };
}

function clip(s: string, max: number): string {
  const t = s.trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
