import { beforeEach, describe, expect, it, vi } from "vitest";

const prisma = vi.hoisted(() => ({
  productSubscription: { updateMany: vi.fn() },
  dailySend: { findUnique: vi.fn() },
  subscriber: { findUnique: vi.fn(), updateMany: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma }));

import { unsubscribeHuman } from "./unsubscribe";

describe("human unsubscribe mutation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("changes only email delivery state and is duplicate-safe", async () => {
    prisma.productSubscription.updateMany.mockResolvedValue({ count: 1 });
    await unsubscribeHuman({ subscription: "opaque" });
    await unsubscribeHuman({ subscription: "opaque" });
    expect(prisma.productSubscription.updateMany).toHaveBeenCalledTimes(2);
    expect(prisma.productSubscription.updateMany).toHaveBeenLastCalledWith({
      where: { unsubscribeToken: "opaque" },
      data: { emailDeliveryStatus: "UNSUBSCRIBED" },
    });
    const serialized = JSON.stringify(prisma.productSubscription.updateMany.mock.calls);
    expect(serialized).not.toMatch(/status.*CANCELED|cancelAtPeriodEnd|canceledAt/);
  });
});
