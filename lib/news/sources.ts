import type { NewsSourceStory } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * OneNews source access. OneNews is strictly source-grounded — issues are built
 * only from real, admin-curated (or ingested) stories in NewsSourceStory. When
 * no source material exists for a segment/day, callers must show a clear "no
 * source material" state and never fabricate news.
 */

export interface NewsSourceQuery {
  /** UTC midnight of the briefing day. */
  date: Date;
  /** Region focus, e.g. "Global" — matched loosely (Global matches all). */
  region: string;
  /** "English" | "Turkish". */
  language: string;
  /** Topic tokens the segment cares about (lowercase), e.g. ["world","business"]. */
  topics: string[];
  /** Max stories to return. */
  limit?: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Returns the candidate source stories for a segment on a day. Looks back a
 * short window (3 days) so a morning briefing can still surface yesterday's
 * important stories. Never returns fabricated content.
 */
export async function loadNewsSourceStories(
  q: NewsSourceQuery,
): Promise<NewsSourceStory[]> {
  const since = new Date(q.date.getTime() - 3 * DAY_MS);
  const stories = await prisma.newsSourceStory.findMany({
    where: {
      language: q.language,
      storyDate: { gte: since, lte: q.date },
      ...(q.region && q.region !== "Global"
        ? { region: { in: [q.region, "Global"] } }
        : {}),
    },
    orderBy: [{ storyDate: "desc" }, { createdAt: "desc" }],
    take: (q.limit ?? 5) * 4,
  });

  // Prefer stories whose topic matches the segment's interests, but never
  // invent — if nothing matches we simply return fewer (possibly zero) stories.
  const wanted = new Set(q.topics.map((t) => t.toLowerCase()));
  const scored = stories
    .map((s) => ({
      s,
      match: wanted.size === 0 || wanted.has(s.topic.toLowerCase()) ? 1 : 0,
    }))
    .sort((a, b) => b.match - a.match);

  return scored.slice(0, q.limit ?? 5).map((x) => x.s);
}

/** Marks stories as consumed by an issue (provenance only — non-destructive). */
export async function markStoriesUsed(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await prisma.newsSourceStory.updateMany({
    where: { id: { in: ids } },
    data: { usedAt: new Date() },
  });
}

export interface ManualStoryInput {
  headline: string;
  sourceName: string;
  sourceUrl: string;
  excerpt?: string | null;
  topic: string;
  region: string;
  language: string;
  storyDate: Date;
  createdBy?: string | null;
}

/** Adds a manually-curated source story. Used by the admin source manager. */
export async function addManualSourceStory(
  input: ManualStoryInput,
): Promise<NewsSourceStory> {
  return prisma.newsSourceStory.create({ data: { ...input } });
}
