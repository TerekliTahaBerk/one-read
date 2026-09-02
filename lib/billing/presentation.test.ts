import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { operatorBillingSummary, presentBilling } from "@/lib/billing/presentation";
import {
  LEGACY_ONEREAD_PRODUCT_ID,
  clearOfferEnv,
  configureAllOffers,
  testProductId,
} from "@/test/fixtures/polar-offers";

beforeEach(() => configureAllOffers());
afterEach(() => clearOfferEnv());

const active = { status: "ACTIVE_PAID", cancelAtPeriodEnd: false };

describe("legacy plans are never labelled as the current bundle", () => {
  it("labels the legacy $1 umbrella as legacy, granting OneArticle", () => {
    const presented = presentBilling({
      ...active,
      productKey: "one-read",
      providerProductId: LEGACY_ONEREAD_PRODUCT_ID,
      plan: "monthly",
    });

    expect(presented.offerLabel).toBe("OneRead (legacy $1 umbrella)");
    expect(presented.offerLabel).not.toBe("OneRead");
    expect(presented.grantsLabel).toBe("OneArticle");
    expect(presented.grandfathered).toBe(true);
  });

  it("labels an unidentified historical one-read row as unidentified, not the bundle", () => {
    const presented = presentBilling({ ...active, productKey: "one-read" });

    expect(presented.unidentified).toBe(true);
    expect(presented.grantsLabel).toBe("OneArticle");
    expect(presented.offerLabel).toMatch(/unidentified/i);
  });

  it("labels the real bundle as OneRead granting both products", () => {
    const presented = presentBilling({
      ...active,
      productKey: "one-read",
      offerKey: "one-read",
      providerProductId: testProductId("one-read", "annual"),
      plan: "annual",
    });

    expect(presented.offerLabel).toBe("OneRead");
    expect(presented.grantsLabel).toBe("OneArticle + OneNews");
    expect(presented.intervalLabel).toBe("Annual");
    expect(presented.grandfathered).toBe(false);
  });
});

describe("interval and lifecycle are never invented", () => {
  it("reports an unrecorded interval rather than guessing monthly", () => {
    expect(presentBilling({ ...active, productKey: "one-read" }).intervalLabel).toBe(
      "Not recorded",
    );
  });

  it.each([
    [{ status: "ACTIVE_PAID", cancelAtPeriodEnd: false }, "Active"],
    [{ status: "ACTIVE_PAID", cancelAtPeriodEnd: true }, "Canceling at period end"],
    [{ status: "PAST_DUE" }, "Past due"],
    [{ status: "CANCELED" }, "Canceled"],
    [{ status: "EXPIRED" }, "Expired"],
    [{ status: "PENDING_CHECKOUT" }, "Awaiting checkout"],
    [{ status: "TRIALING" }, "Trialing"],
    [{ status: "ADMIN_OVERRIDE" }, "Admin override"],
  ])("maps %o to its lifecycle label", (state, expected) => {
    expect(presentBilling({ productKey: "one-article", ...state }).lifecycle).toBe(expected);
  });

  it("surfaces a pending plan change ahead of the raw status", () => {
    expect(
      presentBilling({ ...active, productKey: "one-read" }, { hasPendingChange: true }).lifecycle,
    ).toBe("Change pending");
  });
});

describe("operatorBillingSummary", () => {
  it("distinguishes legacy from current at a glance", () => {
    expect(
      operatorBillingSummary({
        ...active,
        productKey: "one-read",
        providerProductId: LEGACY_ONEREAD_PRODUCT_ID,
      }),
    ).toBe("Legacy · OneRead (legacy $1 umbrella) · OneArticle");

    expect(
      operatorBillingSummary({
        ...active,
        productKey: "one-read",
        providerProductId: testProductId("one-read", "monthly"),
      }),
    ).toBe("Current · OneRead · OneArticle + OneNews");
  });
});
