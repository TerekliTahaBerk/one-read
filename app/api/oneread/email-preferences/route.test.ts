import { beforeEach, describe, expect, it, vi } from "vitest";

const prisma = vi.hoisted(() => ({
  contact: { findUnique: vi.fn() },
  productSubscription: { count: vi.fn(), updateMany: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma }));
vi.mock("@/lib/oneread/verification", () => ({ hasVerifiedEmail: () => true }));
import { POST } from "./route";

const request = (body: unknown) => new Request("https://oneread.test/api/oneread/email-preferences", {
  method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" },
});

beforeEach(() => {
  vi.clearAllMocks();
  prisma.contact.findUnique.mockResolvedValue({ id: "contact_1" });
  prisma.productSubscription.count.mockResolvedValue(0);
  prisma.productSubscription.updateMany.mockResolvedValue({ count: 1 });
});

describe("product email preferences", () => {
  it("turns off only OneNews without touching billing fields", async () => {
    const response = await POST(request({ email: "reader@example.test", product: "one-news", enabled: false }));
    expect(response.status).toBe(200);
    expect(prisma.productSubscription.updateMany).toHaveBeenCalledWith({
      where: { contactId: "contact_1", productKey: { in: ["one-news"] } },
      data: { emailDeliveryStatus: "UNSUBSCRIBED" },
    });
  });

  it("global off scopes to both editorial products", async () => {
    await POST(request({ email: "reader@example.test", product: "all", enabled: false }));
    expect(prisma.productSubscription.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ productKey: { in: ["one-article", "one-news"] } }),
    }));
  });

  it("cannot resume a provider-suppressed address", async () => {
    prisma.productSubscription.count.mockResolvedValue(1);
    const response = await POST(request({ email: "reader@example.test", product: "one-news", enabled: true }));
    expect(response.status).toBe(409);
    expect(prisma.productSubscription.updateMany).not.toHaveBeenCalled();
  });
});
