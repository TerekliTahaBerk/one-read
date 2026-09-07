import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockDeep, mockReset, type DeepMockProxy } from "vitest-mock-extended";
import type { PrismaClient } from "@prisma/client";
vi.mock("@/lib/prisma", () => ({ prisma: mockDeep<PrismaClient>() }));
vi.mock("@/lib/oneread/verification", () => ({ hasVerifiedEmail: vi.fn(() => true) }));
import { POST } from "./route";
import { POST as saveNews } from "../news-preferences/route";
import { hasVerifiedEmail } from "@/lib/oneread/verification";
import { prisma as imported } from "@/lib/prisma";
const db = imported as unknown as DeepMockProxy<PrismaClient>;
beforeEach(() => {
  mockReset(db); vi.mocked(hasVerifiedEmail).mockReturnValue(true);
  db.contact.upsert.mockResolvedValue({ id: "contact" } as never);
  db.productSubscription.upsert.mockResolvedValue({ id: "holder" } as never);
  (db.$transaction as unknown as ReturnType<typeof vi.fn>).mockImplementation((fn) => fn(db));
});
function request(extra = {}) { return new Request("https://oneread.test/api", { method: "POST", body: JSON.stringify({ email: "reader@example.com", offer: "one-read", interval: "annual", context: "signup", topics: ["science", "design"], summaryLanguage: "English", ...extra }) }); }
describe("independent product preference persistence", () => {
  it("saves article slugs and historical labels without modifying billing/email/source/history", async () => {
    expect((await POST(request())).status).toBe(200);
    expect(db.articlePreferences.upsert).toHaveBeenCalledWith({ where: { productSubscriptionId: "holder" }, update: { interests: ["Science", "Design"], primaryInterest: "science", secondaryInterests: ["design"], summaryLanguage: "English" }, create: expect.objectContaining({ sourceLanguage: "Any" }) });
    expect(db.productSubscription.update).not.toHaveBeenCalled();
    expect(db.oneNewsPreferences.upsert).not.toHaveBeenCalled();
  });
  it("saves news only to its own holder", async () => {
    expect((await saveNews(request({ summaryLanguage: "Turkish" }))).status).toBe(200);
    expect(db.productSubscription.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { contactId_productKey: { contactId: "contact", productKey: "one-news" } }, update: {} }));
    expect(db.oneNewsPreferences.upsert).toHaveBeenCalledWith(expect.objectContaining({ update: { topics: ["science", "design"], summaryLanguage: "Turkish" } }));
    expect(db.articlePreferences.upsert).not.toHaveBeenCalled();
    expect(db.productSubscription.update).not.toHaveBeenCalled();
  });
  it.each<[unknown]>([[[]], [["nope"]], [["science", "science"]], [["science", "design", "health", "business", "finance", "economics"]]])("rejects invalid topics %j", async (topics) => {
    expect((await POST(request({ topics }))).status).toBe(400);
    expect(db.articlePreferences.upsert).not.toHaveBeenCalled();
  });
  it("requires email and plan-bound verification", async () => {
    vi.mocked(hasVerifiedEmail).mockReturnValueOnce(false);
    expect((await POST(request())).status).toBe(401);
    vi.mocked(hasVerifiedEmail).mockReturnValueOnce(true).mockReturnValueOnce(false);
    expect((await POST(request())).status).toBe(409);
  });
  it("rejects a product outside the verified offer", async () => expect((await POST(request({ offer: "one-news" }))).status).toBe(400));
  it("requires entitlement for account editing", async () => {
    db.contact.findUnique.mockResolvedValue({ id: "contact", subscriptions: [] } as never);
    expect((await saveNews(request({ context: "account" }))).status).toBe(403);
  });
});
