import { beforeEach, describe, expect, it, vi } from "vitest";

const prisma = vi.hoisted(() => ({
  productSubscription: { updateMany: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma }));

import { POST } from "./route";

describe("RFC 8058 unsubscribe", () => {
  beforeEach(() => vi.clearAllMocks());

  it("is POST-only, generic, and idempotently suppresses email", async () => {
    prisma.productSubscription.updateMany.mockResolvedValue({ count: 0 });
    const response = await POST(new Request("https://www.oneread.email/api/unsubscribe?subscription=opaque", { method: "POST" }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(prisma.productSubscription.updateMany).toHaveBeenCalledWith({
      where: { unsubscribeToken: "opaque" },
      data: { emailDeliveryStatus: "UNSUBSCRIBED" },
    });
  });
});
