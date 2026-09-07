import { describe, expect, it } from "vitest";
import { evidenceOffer } from "./launch-health";

const base = {
  id: "sub_1",
  productKey: "one-article",
  offerKey: null,
  providerProductId: null,
  plan: "annual",
  status: "PENDING_CHECKOUT",
  paymentProvider: null,
  providerSubscriptionId: null,
  providerCheckoutSessionId: null,
};

describe("launch health offer attribution", () => {
  it("attributes current offers from persisted commercial evidence", () => {
    expect(evidenceOffer({ ...base, offerKey: "one-news", productKey: "one-news" })).toBe("one-news");
    expect(evidenceOffer({ ...base, offerKey: "one-read", productKey: "one-read" })).toBe("one-read");
  });

  it("does not guess that an unidentified historical one-read row is a bundle", () => {
    expect(evidenceOffer({ ...base, productKey: "one-read" })).toBeNull();
  });

  it("does not mix legacy offers into the current launch funnel", () => {
    expect(evidenceOffer({ ...base, productKey: "one-read", offerKey: "legacy-one-read-umbrella" })).toBeNull();
  });
});
