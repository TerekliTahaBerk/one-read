import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockDeep, mockReset, type DeepMockProxy } from "vitest-mock-extended";
import type { PrismaClient } from "@prisma/client";

vi.mock("@/lib/prisma", () => ({ prisma: mockDeep<PrismaClient>() }));

import { prisma as prismaImport } from "@/lib/prisma";
import { countDeliveryStates } from "./delivery-queries";

const prisma = prismaImport as unknown as DeepMockProxy<PrismaClient>;

function group(key: "status" | "providerStatus", rows: [string | null, number][]) {
  return rows.map(([value, count]) => ({ [key]: value, _count: { _all: count } }));
}

/** groupBy's overloads defeat inference; the mock surface is what we need. */
function groupByMock() {
  return prisma.oneArticleDelivery.groupBy as unknown as {
    mockResolvedValueOnce: (value: unknown) => { mockResolvedValueOnce: (value: unknown) => void };
  };
}

beforeEach(() => {
  mockReset(prisma);
});

describe("countDeliveryStates", () => {
  it("aggregates in the database rather than loading delivery rows", async () => {
    groupByMock()
      .mockResolvedValueOnce(
        group("status", [
          ["SENT", 400],
          ["FAILED", 3],
          ["RECONCILIATION_REQUIRED", 2],
          ["SKIPPED", 5],
        ]) as never,
      )
      .mockResolvedValueOnce(
        group("providerStatus", [
          ["DELIVERED", 380],
          ["ACCEPTED", 18],
          ["BOUNCED", 2],
          [null, 10],
        ]) as never,
      );

    const counts = await countDeliveryStates({ issueId: "issue_1" });

    expect(prisma.oneArticleDelivery.findMany).not.toHaveBeenCalled();
    expect(counts.total).toBe(410);
    expect(counts.logical.SENT).toBe(400);
    expect(counts.provider.DELIVERED).toBe(380);
    expect(counts.ambiguous).toBe(2);
    expect(counts.awaitingProvider).toBe(18);
    expect(counts.noProviderEvent).toBe(10);
  });

  it("counts logical and provider failures together", async () => {
    groupByMock()
      .mockResolvedValueOnce(group("status", [["FAILED", 3]]) as never)
      .mockResolvedValueOnce(group("providerStatus", [["FAILED", 4]]) as never);

    const counts = await countDeliveryStates({ issueId: "issue_1" });

    expect(counts.failed).toBe(7);
  });

  it("returns zeroes without querying when there is no edition", async () => {
    const counts = await countDeliveryStates(null);

    expect(prisma.oneArticleDelivery.groupBy).not.toHaveBeenCalled();
    expect(counts).toMatchObject({ total: 0, failed: 0, ambiguous: 0 });
  });
});
