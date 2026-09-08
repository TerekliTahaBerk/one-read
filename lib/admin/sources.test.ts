import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockDeep, mockReset, type DeepMockProxy } from "vitest-mock-extended";
import type { PrismaClient } from "@prisma/client";

vi.mock("@/lib/prisma", () => ({ prisma: mockDeep<PrismaClient>() }));
vi.mock("@/lib/admin/audit", () => ({ recordAudit: vi.fn() }));

import { prisma as prismaImport } from "@/lib/prisma";
import { recordAudit } from "@/lib/admin/audit";
import { loadSourceOverview, setSourceActive } from "./sources";

const prisma = prismaImport as unknown as DeepMockProxy<PrismaClient>;

function source(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "src-1",
    slug: "example-blog",
    name: "Example Blog",
    feedUrl: "https://example.test/feed.xml",
    homepage: null,
    defaultTopic: "technology",
    defaultSubtopics: [],
    language: "English",
    active: true,
    notes: null,
    lastFetchedAt: new Date("2026-09-07T06:00:00.000Z"),
    lastError: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function mockOverviewQueries(sources: unknown[], totals: unknown[] = [], recent: unknown[] = []) {
  (prisma.source.findMany as unknown as { mockResolvedValue: (v: unknown) => void })
    .mockResolvedValue(sources as never);
  (prisma.article.groupBy as unknown as { mockResolvedValueOnce: (v: unknown) => { mockResolvedValueOnce: (v: unknown) => void } })
    .mockResolvedValueOnce(totals as never)
    .mockResolvedValueOnce(recent as never);
}

beforeEach(() => {
  mockReset(prisma);
  vi.mocked(recordAudit).mockClear();
});

describe("loadSourceOverview", () => {
  it("joins article counts by source name, the only key articles record", async () => {
    mockOverviewQueries(
      [source()],
      [{ sourceName: "Example Blog", _count: { _all: 120 } }],
      [{ sourceName: "Example Blog", _count: { _all: 9 } }],
    );

    const overview = await loadSourceOverview();
    expect(overview.rows[0]).toMatchObject({
      name: "Example Blog",
      totalArticles: 120,
      recentArticles: 9,
      blockedInCode: false,
    });
    expect(overview.usingSeedFallback).toBe(false);
    expect(overview.activeCount).toBe(1);
  });

  it("reports the seed fallback when no usable feed is enabled", async () => {
    mockOverviewQueries([source({ active: false })]);

    const overview = await loadSourceOverview();
    expect(overview.usingSeedFallback).toBe(true);
    expect(overview.activeCount).toBe(0);
    expect(overview.seedSourceCount).toBeGreaterThan(0);
  });

  it("does not count a code-blocked feed as enabled, whatever the flag says", async () => {
    mockOverviewQueries([source({ slug: "sarkac", name: "Sarkaç", active: true })]);

    const overview = await loadSourceOverview();
    expect(overview.rows[0].blockedInCode).toBe(true);
    expect(overview.activeCount).toBe(0);
    expect(overview.usingSeedFallback).toBe(true);
  });

  it("counts feeds that are reporting an error or have never been fetched", async () => {
    mockOverviewQueries([
      source({ lastError: "403 Forbidden" }),
      source({ id: "src-2", slug: "b", name: "B", feedUrl: "https://b.test/f", lastFetchedAt: null }),
    ]);

    const overview = await loadSourceOverview();
    expect(overview.erroringCount).toBe(1);
    expect(overview.neverFetchedCount).toBe(1);
  });
});

describe("setSourceActive", () => {
  it("refuses to enable a feed ingestion ignores", async () => {
    await expect(setSourceActive("sarkac", true, "admin")).rejects.toThrow("source_blocked_in_code");
    expect(prisma.source.updateMany).not.toHaveBeenCalled();
  });

  it("still allows disabling a code-blocked feed", async () => {
    (prisma.source.updateMany as unknown as { mockResolvedValue: (v: unknown) => void })
      .mockResolvedValue({ count: 1 } as never);
    await expect(setSourceActive("sarkac", false, "admin")).resolves.toBeUndefined();
  });

  it("reports an unknown slug rather than silently succeeding", async () => {
    (prisma.source.updateMany as unknown as { mockResolvedValue: (v: unknown) => void })
      .mockResolvedValue({ count: 0 } as never);
    await expect(setSourceActive("nope", false, "admin")).rejects.toThrow("source_not_found");
    expect(recordAudit).not.toHaveBeenCalled();
  });

  it("audits a successful change", async () => {
    (prisma.source.updateMany as unknown as { mockResolvedValue: (v: unknown) => void })
      .mockResolvedValue({ count: 1 } as never);
    await setSourceActive("example-blog", true, "editor@oneread");
    expect(recordAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        actor: "editor@oneread",
        action: "source.enable",
        targetId: "example-blog",
      }),
    );
  });
});
