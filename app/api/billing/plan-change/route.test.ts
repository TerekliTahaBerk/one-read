/**
 * Route-level behaviour for plan changes.
 *
 * The property that matters most here: a grandfathered subscriber cannot be
 * moved without a deliberate two-step confirmation, and the preview step must
 * never mutate anything.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const previewOfferChange = vi.fn();
const changeOffer = vi.fn();
vi.mock("@/lib/billing/offer-checkout", () => ({
  previewOfferChange: (...args: unknown[]) => previewOfferChange(...args),
  changeOffer: (...args: unknown[]) => changeOffer(...args),
}));

const hasVerifiedEmail = vi.fn();
vi.mock("@/lib/oneread/verification", () => ({
  hasVerifiedEmail: (...args: unknown[]) => hasVerifiedEmail(...args),
}));

import { POST } from "@/app/api/billing/plan-change/route";
import { GRANDFATHER_FORFEIT_WARNING } from "@/lib/billing/transitions";

function post(body: unknown) {
  return new Request("https://oneread.test/api/billing/plan-change", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  previewOfferChange.mockReset();
  changeOffer.mockReset();
  hasVerifiedEmail.mockReset().mockReturnValue(true);
});

afterEach(() => vi.clearAllMocks());

describe("two-step confirmation", () => {
  it("previews without confirm, and never calls the mutating path", async () => {
    previewOfferChange.mockResolvedValue({
      ok: true,
      plan: { kind: "upgrade", effective: "immediately", forfeitsGrandfathering: false },
    });

    const response = await POST(
      post({ email: "a@b.test", offer: "one-read", interval: "monthly" }),
    );

    await expect(response.json()).resolves.toMatchObject({ action: "preview" });
    expect(previewOfferChange).toHaveBeenCalledTimes(1);
    expect(changeOffer).not.toHaveBeenCalled();
  });

  it("executes only with confirm: true", async () => {
    changeOffer.mockResolvedValue({
      ok: true,
      transitionId: "trans_1",
      state: "APPLIED",
      appliedNow: true,
      plan: { effective: "immediately" },
    });

    const response = await POST(
      post({ email: "a@b.test", offer: "one-read", interval: "monthly", confirm: true }),
    );

    await expect(response.json()).resolves.toMatchObject({
      action: "changed",
      state: "APPLIED",
      appliedNow: true,
    });
    expect(changeOffer).toHaveBeenCalledTimes(1);
  });
});

describe("grandfathering", () => {
  it("returns the warning and a 409 when acknowledgement is missing", async () => {
    previewOfferChange.mockResolvedValue({
      ok: false,
      refusal: "grandfather_acknowledgement_required",
      message: GRANDFATHER_FORFEIT_WARNING,
    });

    const response = await POST(
      post({ email: "a@b.test", offer: "one-read", interval: "monthly" }),
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      refusal: "grandfather_acknowledgement_required",
      error: GRANDFATHER_FORFEIT_WARNING,
    });
    expect(changeOffer).not.toHaveBeenCalled();
  });

  it("passes the acknowledgement through only when explicitly true", async () => {
    changeOffer.mockResolvedValue({
      ok: true,
      transitionId: "t",
      state: "APPLIED",
      appliedNow: true,
      plan: { effective: "immediately" },
    });

    await POST(
      post({
        email: "a@b.test",
        offer: "one-read",
        interval: "monthly",
        confirm: true,
        acknowledgeGrandfatherLoss: "yes",
      }),
    );

    // A truthy-but-not-true value must not count as consent.
    expect(changeOffer).toHaveBeenCalledWith(
      expect.objectContaining({ acknowledgeGrandfatherLoss: false }),
    );
  });
});

describe("validation", () => {
  it.each([
    ["a raw provider product id", { offer: "prod_abc", interval: "monthly" }],
    ["an unknown interval", { offer: "one-read", interval: "biennial" }],
  ])("rejects %s", async (_label, body) => {
    const response = await POST(post({ email: "a@b.test", ...body }));
    expect(response.status).toBe(400);
    expect(previewOfferChange).not.toHaveBeenCalled();
    expect(changeOffer).not.toHaveBeenCalled();
  });

  it("requires a verified email", async () => {
    hasVerifiedEmail.mockReturnValue(false);
    const response = await POST(
      post({ email: "a@b.test", offer: "one-read", interval: "monthly", confirm: true }),
    );
    expect(response.status).toBe(401);
    expect(changeOffer).not.toHaveBeenCalled();
  });
});
