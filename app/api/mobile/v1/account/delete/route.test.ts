import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(), pushDelete: vi.fn(), readingDelete: vi.fn(), deliveryDelete: vi.fn(), prefsDelete: vi.fn(), sessionDelete: vi.fn(), contactUpdate: vi.fn(), subscriptionUpdate: vi.fn(),
}));
vi.mock("@/lib/mobile/authenticated", () => ({ requireMobileSession: vi.fn().mockResolvedValue({ id: "session-1", contactId: "contact-1" }), isMobileError: () => false }));
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: mocks.transaction } }));
import { POST } from "@/app/api/mobile/v1/account/delete/route";

describe("mobile account deletion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(async (callback: (tx: unknown) => unknown) => callback({
      pushDevice: { deleteMany: mocks.pushDelete }, readingState: { deleteMany: mocks.readingDelete }, oneArticleDelivery: { deleteMany: mocks.deliveryDelete },
      articlePreferences: { deleteMany: mocks.prefsDelete }, mobileSession: { deleteMany: mocks.sessionDelete }, contact: { update: mocks.contactUpdate }, productSubscription: { updateMany: mocks.subscriptionUpdate },
    }));
  });
  it("requires an explicit confirmation", async () => {
    const response = await POST(new Request("https://example.test", { method: "POST", body: JSON.stringify({ confirmation: "delete" }) }));
    expect(response.status).toBe(400); expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it("removes mobile/editorial personal state and anonymizes the contact", async () => {
    const response = await POST(new Request("https://example.test", { method: "POST", body: JSON.stringify({ confirmation: "DELETE" }) }));
    expect(response.status).toBe(200); expect(mocks.sessionDelete).toHaveBeenCalledWith({ where: { contactId: "contact-1" } });
    expect(mocks.contactUpdate.mock.calls[0][0].data.email).toMatch(/^deleted-[a-f0-9]+@deleted\.invalid$/);
    expect(mocks.subscriptionUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ emailDeliveryStatus: "UNSUBSCRIBED" }) }));
  });
});
