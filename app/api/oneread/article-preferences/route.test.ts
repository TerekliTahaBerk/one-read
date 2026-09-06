import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockDeep, mockReset, type DeepMockProxy } from "vitest-mock-extended";
import type { PrismaClient } from "@prisma/client";

vi.mock("@/lib/prisma", () => ({ prisma: mockDeep<PrismaClient>() }));
vi.mock("@/lib/oneread/verification", () => ({ hasVerifiedEmail: vi.fn(() => true) }));
vi.mock("@/lib/subscriptions", () => ({ upsertArticlePreferences: vi.fn() }));

import { POST } from "./route";
import { prisma as prismaImport } from "@/lib/prisma";

const prisma = prismaImport as unknown as DeepMockProxy<PrismaClient>;

beforeEach(() => {
  mockReset(prisma);
  prisma.contact.upsert.mockResolvedValue({ id: "contact_1" } as never);
  prisma.productSubscription.upsert.mockImplementation(async ({ create }: any) => ({ id: `sub_${create.productKey}`, ...create }));
  prisma.productSubscription.update.mockResolvedValue({} as never);
});

function request(offer: string) {
  return new Request("https://www.oneread.email/api/oneread/article-preferences", {
    method: "POST",
    body: JSON.stringify({ email: " Reader@Example.com ", offer, summaryLanguage: "English" }),
  });
}

describe("offer-scoped signup persistence", () => {
  it.each(["one-article", "one-news"] as const)("creates only the %s subscription slot", async (offer) => {
    expect((await POST(request(offer))).status).toBe(200);
    expect(prisma.productSubscription.upsert).toHaveBeenCalledTimes(1);
    expect(prisma.productSubscription.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ productKey: offer }),
    }));
    expect(prisma.productSubscription.update).toHaveBeenCalledWith({
      where: { id: `sub_${offer}` }, data: { status: "PENDING_CHECKOUT" },
    });
  });

  it("creates the bundle billing row plus the OneArticle delivery preference holder", async () => {
    expect((await POST(request("one-read"))).status).toBe(200);
    const keys = prisma.productSubscription.upsert.mock.calls.map(([arg]: any[]) => arg.create.productKey);
    expect(keys).toEqual(["one-read", "one-article"]);
    expect(prisma.productSubscription.update).toHaveBeenCalledWith({
      where: { id: "sub_one-read" }, data: { status: "PENDING_CHECKOUT" },
    });
  });
});
