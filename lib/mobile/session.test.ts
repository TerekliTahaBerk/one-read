import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ create: vi.fn(), findUnique: vi.fn(), updateMany: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { mobileSession: mocks } }));
import { authenticateMobileRequest, createMobileSession } from "@/lib/mobile/session";

describe("mobile sessions", () => {
  beforeEach(() => { vi.clearAllMocks(); process.env.MOBILE_SESSION_SECRET = "test-only-secret-with-at-least-32-bytes"; });
  it("returns the raw token once but persists only its hash", async () => {
    mocks.create.mockResolvedValue({});
    const result = await createMobileSession({ contactId: "contact-1", now: new Date("2026-08-20") });
    const data = mocks.create.mock.calls[0][0].data;
    expect(result.token).toMatch(/^ors_1\./); expect(data.tokenHash).not.toContain(result.token); expect(data).not.toHaveProperty("token");
  });
  it("rejects expired sessions before comparison", async () => {
    mocks.findUnique.mockResolvedValue({ selector: "abcdefghijklmnop", tokenHash: "x", revokedAt: null, expiresAt: new Date("2026-08-19"), lastUsedAt: new Date(), id: "s", contactId: "c" });
    const request = new Request("https://example.test", { headers: { authorization: `Bearer ors_1.abcdefghijklmnop.${"a".repeat(43)}` } });
    expect(await authenticateMobileRequest(request, new Date("2026-08-20"))).toBeNull();
  });
});
