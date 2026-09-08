/**
 * Admin aggregation over reader reactions.
 *
 * Every figure is produced by a database `groupBy` rather than by pulling the
 * feedback table into JavaScript, so this screen stays usable as reactions
 * accumulate. Reactions are the only direct signal readers send back, so the
 * screen is built around the question that actually matters: what is losing
 * them — a topic, a source, or a particular piece.
 */

import { prisma } from "@/lib/prisma";
import { REACTIONS, type Reaction } from "@/lib/feedback";

/** Reaction weights, matching the personalization deltas in `lib/feedback`. */
const SENTIMENT: Record<Reaction, number> = {
  loved: 1,
  liked: 0.5,
  meh: -0.25,
  disliked: -1,
};

export interface ReactionCounts {
  loved: number;
  liked: number;
  meh: number;
  disliked: number;
  total: number;
  /** Mean sentiment in [-1, 1]; `null` when there is nothing to average. */
  score: number | null;
}

export interface FeedbackBreakdownRow extends ReactionCounts {
  label: string;
}

export interface FeedbackOverview {
  totals: ReactionCounts;
  last7: ReactionCounts;
  last30: ReactionCounts;
  byTopic: FeedbackBreakdownRow[];
  bySource: FeedbackBreakdownRow[];
  recent: {
    id: string;
    createdAt: Date;
    reaction: string;
    topic: string | null;
    sourceName: string | null;
    subscriberEmail: string | null;
    articleTitle: string | null;
  }[];
}

function emptyCounts(): ReactionCounts {
  return { loved: 0, liked: 0, meh: 0, disliked: 0, total: 0, score: null };
}

function tally(rows: { reaction: string; count: number }[]): ReactionCounts {
  const counts = emptyCounts();
  let weighted = 0;
  for (const row of rows) {
    if (!(REACTIONS as readonly string[]).includes(row.reaction)) continue;
    const reaction = row.reaction as Reaction;
    counts[reaction] += row.count;
    counts.total += row.count;
    weighted += SENTIMENT[reaction] * row.count;
  }
  counts.score = counts.total > 0 ? Number((weighted / counts.total).toFixed(2)) : null;
  return counts;
}

async function countsSince(since: Date | null): Promise<ReactionCounts> {
  const grouped = await prisma.feedback.groupBy({
    by: ["reaction"],
    where: since ? { createdAt: { gte: since } } : undefined,
    _count: { _all: true },
  });
  return tally(grouped.map((r) => ({ reaction: r.reaction, count: r._count._all })));
}

/**
 * Group by a dimension plus reaction in one query, then fold in memory. The
 * fold is over (dimension × 4 reactions) rows, not over feedback rows, so it
 * stays small however much feedback exists.
 */
async function breakdown(dimension: "topic" | "sourceName"): Promise<FeedbackBreakdownRow[]> {
  const grouped =
    dimension === "topic"
      ? await prisma.feedback.groupBy({ by: ["topic", "reaction"], _count: { _all: true } })
      : await prisma.feedback.groupBy({ by: ["sourceName", "reaction"], _count: { _all: true } });

  const buckets = new Map<string, { reaction: string; count: number }[]>();
  for (const row of grouped) {
    const raw = dimension === "topic"
      ? (row as { topic: string | null }).topic
      : (row as { sourceName: string | null }).sourceName;
    const label = raw ?? "Not recorded";
    const list = buckets.get(label) ?? [];
    list.push({ reaction: row.reaction, count: row._count._all });
    buckets.set(label, list);
  }

  return [...buckets.entries()]
    .map(([label, rows]) => ({ label, ...tally(rows) }))
    // Worst first: this screen exists to surface what is not working.
    .sort((a, b) => (a.score ?? 0) - (b.score ?? 0) || b.total - a.total);
}

export async function loadFeedbackOverview(recentLimit = 50): Promise<FeedbackOverview> {
  const now = Date.now();
  const [totals, last7, last30, byTopic, bySource, recentRows] = await Promise.all([
    countsSince(null),
    countsSince(new Date(now - 7 * 86_400_000)),
    countsSince(new Date(now - 30 * 86_400_000)),
    breakdown("topic"),
    breakdown("sourceName"),
    prisma.feedback.findMany({
      orderBy: { createdAt: "desc" },
      take: recentLimit,
      select: {
        id: true,
        createdAt: true,
        reaction: true,
        topic: true,
        sourceName: true,
        articleId: true,
        subscriber: { select: { email: true } },
      },
    }),
  ]);

  // Titles are resolved in one extra query rather than a join per row; a
  // deleted article simply has no title to show.
  const articleIds = [...new Set(recentRows.map((r) => r.articleId).filter((id): id is string => Boolean(id)))];
  const articles = articleIds.length
    ? await prisma.article.findMany({ where: { id: { in: articleIds } }, select: { id: true, title: true } })
    : [];
  const titleById = new Map(articles.map((a) => [a.id, a.title]));

  return {
    totals,
    last7,
    last30,
    byTopic,
    bySource,
    recent: recentRows.map((row) => ({
      id: row.id,
      createdAt: row.createdAt,
      reaction: row.reaction,
      topic: row.topic,
      sourceName: row.sourceName,
      subscriberEmail: row.subscriber?.email ?? null,
      articleTitle: row.articleId ? (titleById.get(row.articleId) ?? null) : null,
    })),
  };
}
