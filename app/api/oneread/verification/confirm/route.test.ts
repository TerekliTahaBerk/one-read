/**
 * The confirm route is where email ownership and purchase intent are bound
 * together. These tests pin that binding: a valid plan is frozen into the
 * session, an invalid one is refused rather than dropped, and a failed
 * verification issues no session at all.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const confirmVerificationCode = vi.fn();
const setVerifiedEmailCookie = vi.fn();
vi.mock("@/lib/oneread/verification", () => ({
  VERIFICATION_PURPOSES: { signup: "one-read-signup", preferences: "one-read-preferences" },
  emailVerificationSecretConfigured: () => true,
  confirmVerificationCode: (...args: unknown[]) => confirmVerificationCode(...args),
  setVerifiedEmailCookie: (...args: unknown[]) => setVerifiedEmailCookie(...args),
}));

import { POST } from "@/app/api/oneread/verification/confirm/route";

function post(body: unknown) {
  return new Request("https://oneread.test/api/oneread/verification/confirm", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

const VALID = { email: "a@b.test", code: "123456" };

beforeEach(() => {
  confirmVerificationCode.mockReset().mockResolvedValue({ ok: true });
  setVerifiedEmailCookie.mockReset();
});

afterEach(() => vi.clearAllMocks());

describe("binding the purchase intent", () => {
  it("freezes the offer and interval on screen into the session", async () => {
    const response = await POST(post({ ...VALID, offer: "one-read", interval: "annual" }));

    expect(response.status).toBe(200);
    expect(setVerifiedEmailCookie).toHaveBeenCalledWith(
      expect.anything(), "a@b.test", "one-read-signup", "checkout:one-read:annual",
    );
  });

  it("issues an unbound session when no plan is named", async () => {
    await POST(post(VALID));

    expect(setVerifiedEmailCookie).toHaveBeenCalledWith(
      expect.anything(), "a@b.test", "one-read-signup", null,
    );
  });

  it.each([
    ["an unknown offer", { offer: "one-everything", interval: "annual" }],
    ["a raw provider product id", { offer: "prod_abc123", interval: "annual" }],
    ["an unsupported interval", { offer: "one-read", interval: "weekly" }],
    ["an offer with no interval", { offer: "one-read" }],
    ["an interval with no offer", { interval: "annual" }],
  ])("rejects %s rather than falling back to an unbound session", async (_label, plan) => {
    const response = await POST(post({ ...VALID, ...plan }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: "unknown_plan_selection" });
    expect(setVerifiedEmailCookie).not.toHaveBeenCalled();
    expect(confirmVerificationCode).not.toHaveBeenCalled();
  });
});

describe("failed verification", () => {
  it.each([
    ["invalid", 400],
    ["expired", 410],
    ["too_many", 429],
    ["incorrect", 401],
  ])("issues no session when the code is %s", async (reason, status) => {
    confirmVerificationCode.mockResolvedValue({ ok: false, reason });

    const response = await POST(post({ ...VALID, offer: "one-read", interval: "annual" }));

    expect(response.status).toBe(status);
    expect(setVerifiedEmailCookie).not.toHaveBeenCalled();
  });

  it("rejects a malformed code before touching verification", async () => {
    const response = await POST(post({ email: "a@b.test", code: "12345" }));

    expect(response.status).toBe(400);
    expect(confirmVerificationCode).not.toHaveBeenCalled();
  });
});
