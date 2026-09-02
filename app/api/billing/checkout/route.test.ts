/**
 * Route-level validation for the offer checkout endpoint.
 *
 * The security property under test: the request body names an offer, and no
 * value in it can select a Polar product directly.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const startOfferCheckout = vi.fn();
vi.mock("@/lib/billing/offer-checkout", () => ({
  startOfferCheckout: (...args: unknown[]) => startOfferCheckout(...args),
}));

const hasVerifiedEmail = vi.fn();
vi.mock("@/lib/oneread/verification", () => ({
  hasVerifiedEmail: (...args: unknown[]) => hasVerifiedEmail(...args),
}));

import { POST } from "@/app/api/billing/checkout/route";

function post(body: unknown, raw = false) {
  return new Request("https://oneread.test/api/billing/checkout", {
    method: "POST",
    body: raw ? (body as string) : JSON.stringify(body),
  });
}

beforeEach(() => {
  startOfferCheckout.mockReset();
  hasVerifiedEmail.mockReset().mockReturnValue(true);
  startOfferCheckout.mockResolvedValue({ kind: "redirect", url: "https://polar.test/c1" });
});

afterEach(() => vi.clearAllMocks());

describe("accepted requests", () => {
  it.each([
    ["one-article", "monthly"],
    ["one-article", "annual"],
    ["one-news", "monthly"],
    ["one-news", "annual"],
    ["one-read", "monthly"],
    ["one-read", "annual"],
  ])("passes %s %s through to the server-side resolver", async (offer, interval) => {
    const response = await POST(post({ email: "a@b.test", offer, interval }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      action: "redirect",
      url: "https://polar.test/c1",
    });
    expect(startOfferCheckout).toHaveBeenCalledWith({
      email: "a@b.test",
      offer,
      interval,
    });
  });
});

describe("rejected requests", () => {
  it("rejects malformed JSON", async () => {
    const response = await POST(post("{not json", true));
    expect(response.status).toBe(400);
    expect(startOfferCheckout).not.toHaveBeenCalled();
  });

  it("rejects a missing or invalid email", async () => {
    const response = await POST(post({ offer: "one-read", interval: "monthly" }));
    expect(response.status).toBe(400);
    expect(startOfferCheckout).not.toHaveBeenCalled();
  });

  it("requires a verified email", async () => {
    hasVerifiedEmail.mockReturnValue(false);
    const response = await POST(
      post({ email: "a@b.test", offer: "one-read", interval: "monthly" }),
    );
    expect(response.status).toBe(401);
    expect(startOfferCheckout).not.toHaveBeenCalled();
  });

  it.each([
    ["a raw Polar product id", { offer: "prod_abc123", interval: "monthly" }],
    ["an unknown offer", { offer: "one-everything", interval: "monthly" }],
    ["a legacy plan key", { offer: "legacy-one-read-umbrella", interval: "monthly" }],
    ["an unsupported interval", { offer: "one-article", interval: "weekly" }],
    ["a missing offer", { interval: "monthly" }],
    ["a missing interval", { offer: "one-article" }],
    ["a non-string offer", { offer: ["one-read"], interval: "monthly" }],
  ])("rejects %s with 400 and never reaches the resolver", async (_label, body) => {
    const response = await POST(post({ email: "a@b.test", ...body }));

    expect(response.status).toBe(400);
    expect(startOfferCheckout).not.toHaveBeenCalled();
  });

  it("does not leak the missing environment variable to the caller", async () => {
    startOfferCheckout.mockResolvedValue({
      kind: "not_configured",
      envVar: "POLAR_ONE_READ_ANNUAL_PRODUCT_ID",
    });

    const response = await POST(
      post({ email: "a@b.test", offer: "one-read", interval: "annual" }),
    );
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(JSON.stringify(body)).not.toMatch(/POLAR_/);
  });
});

describe("guarded outcomes", () => {
  it("reports an already-active plan rather than selling a second one", async () => {
    startOfferCheckout.mockResolvedValue({ kind: "already_active", billingManageable: true });
    const response = await POST(
      post({ email: "a@b.test", offer: "one-news", interval: "monthly" }),
    );
    await expect(response.json()).resolves.toMatchObject({ action: "already_active" });
  });

  it("routes an existing paid plan to the transition flow", async () => {
    startOfferCheckout.mockResolvedValue({
      kind: "transition_required",
      currentOfferKey: "one-article",
    });
    const response = await POST(
      post({ email: "a@b.test", offer: "one-read", interval: "monthly" }),
    );
    await expect(response.json()).resolves.toMatchObject({
      action: "transition_required",
      currentOfferKey: "one-article",
    });
  });
});
