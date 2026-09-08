import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockDeep, mockReset, type DeepMockProxy } from "vitest-mock-extended";
import type { PrismaClient } from "@prisma/client";

vi.mock("@/lib/prisma", () => ({ prisma: mockDeep<PrismaClient>() }));

import { prisma as prismaImport } from "@/lib/prisma";
import { loadFeedbackOverview } from "./feedback-queries";

const prisma = prismaImport as unknown as DeepMockProxy<PrismaClient>;

type GroupByMock = { mockResolvedValueOnce: (v: unknown) => GroupByMock };

function feedbackGroupBy() {
  return prisma.feedback.groupBy as unknown as GroupByMock;
}

function counts(rows: [string, number][]) {
  return rows.map(([reaction, count]) => ({ reaction, _count: { _all: count } }));
}

beforeEach(() => {
  mockReset(prisma);
  (prisma.feedback.findMany as unknown as { mockResolvedValue: (v: unknown) => void })
    .mockResolvedValue([] as never);
  (prisma.article.findMany as unknown as { mockResolvedValue: (v: unknown) => void })
    .mockResolvedValue([] as never);
});

/**
 * `loadFeedbackOverview` issues its six queries in a fixed order:
 * totals, 7d, 30d, by topic, by source, recent rows.
 */
function mockQueries(opts: {
  totals?: [string, number][];
  last7?: [string, number][];
  last30?: [string, number][];
  byTopic?: unknown[];
  bySource?: unknown[];
}) {
  feedbackGroupBy()
    .mockResolvedValueOnce(counts(opts.totals ?? []) as never)
    .mockResolvedValueOnce(counts(opts.last7 ?? []) as never)
    .mockResolvedValueOnce(counts(opts.last30 ?? []) as never)
    .mockResolvedValueOnce((opts.byTopic ?? []) as never)
    .mockResolvedValueOnce((opts.bySource ?? []) as never);
}

describe("loadFeedbackOverview", () => {
  it("scores a mix of reactions between -1 and 1", async () => {
    mockQueries({
      totals: [["loved", 3], ["liked", 1], ["meh", 0], ["disliked", 0]],
    });

    const overview = await loadFeedbackOverview();
    expect(overview.totals.total).toBe(4);
    expect(overview.totals.score).toBe(0.88);
  });

  it("returns a null score rather than zero when nothing has been rated", async () => {
    mockQueries({});
    const overview = await loadFeedbackOverview();
    expect(overview.totals.total).toBe(0);
    expect(overview.totals.score).toBeNull();
  });

  it("ignores a reaction value the app does not recognise", async () => {
    mockQueries({ totals: [["loved", 2], ["shrug", 99]] });
    const overview = await loadFeedbackOverview();
    expect(overview.totals.total).toBe(2);
    expect(overview.totals.score).toBe(1);
  });

  it("orders breakdowns worst first, and labels a missing dimension", async () => {
    mockQueries({
      byTopic: [
        { topic: "technology", reaction: "loved", _count: { _all: 10 } },
        { topic: "politics", reaction: "disliked", _count: { _all: 8 } },
        { topic: null, reaction: "liked", _count: { _all: 1 } },
      ],
    });

    const overview = await loadFeedbackOverview();
    expect(overview.byTopic.map((row) => row.label)).toEqual([
      "politics",
      "Not recorded",
      "technology",
    ]);
    expect(overview.byTopic[0].score).toBe(-1);
  });

  it("aggregates in the database rather than loading the feedback table", async () => {
    mockQueries({});
    await loadFeedbackOverview();
    expect(prisma.feedback.groupBy).toHaveBeenCalledTimes(5);
    // The only row fetch is the bounded "latest reactions" list.
    expect(prisma.feedback.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.feedback.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 50 }),
    );
  });
});
