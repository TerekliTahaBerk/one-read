/**
 * Milestone C2 billing entitlement matrix.
 *
 * The question every case here asks is the same: given these subscription rows,
 * which editorial products does the contact get? The cases that matter most are
 * the ones where a wrong answer costs money — a grandfathered $1 subscriber
 * silently receiving OneNews, or a paying bundle subscriber losing OneArticle.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveEntitlements } from "@/lib/products/entitlements";
import type { EntitlementSubscriptionInput } from "@/lib/products/entitlements";
import {
  LEGACY_ONEREAD_PRODUCT_ID,
  clearOfferEnv,
  configureAllOffers,
  testProductId,
} from "@/test/fixtures/polar-offers";

beforeEach(() => configureAllOffers());
afterEach(() => clearOfferEnv());

const NOW = new Date("2026-06-01T00:00:00Z");
const FUTURE = new Date("2026-07-01T00:00:00Z");
const PAST = new Date("2026-05-01T00:00:00Z");

function row(overrides: Partial<EntitlementSubscriptionInput> = {}): EntitlementSubscriptionInput {
  return {
    productKey: "one-article",
    status: "ACTIVE_PAID",
    paymentProvider: "polar",
    adminOverride: false,
    trialEndsAt: null,
    currentPeriodEnd: FUTURE,
    pastDueAt: null,
    ...overrides,
  };
}

/** Products granted, as a sorted list, for compact assertions. */
function granted(subs: EntitlementSubscriptionInput[]): string[] {
  const snapshot = resolveEntitlements(subs, NOW);
  return (["one-article", "one-news"] as const).filter(
    (product) => snapshot.byProduct[product].granted,
  );
}

describe("legacy $1 OneRead", () => {
  const legacy = (overrides: Partial<EntitlementSubscriptionInput> = {}) =>
    row({
      productKey: "one-read",
      providerProductId: LEGACY_ONEREAD_PRODUCT_ID,
      offerKey: "legacy-one-read-umbrella",
      plan: "monthly",
      ...overrides,
    });

  it("active grants OneArticle and never OneNews", () => {
    expect(granted([legacy()])).toEqual(["one-article"]);
  });

  it("cancel-at-period-end keeps access until the provider period actually ends", () => {
    expect(granted([legacy({ status: "CANCELED", currentPeriodEnd: FUTURE })])).toEqual([
      "one-article",
    ]);
    expect(granted([legacy({ status: "CANCELED", currentPeriodEnd: PAST })])).toEqual([]);
  });

  it("expired grants nothing", () => {
    expect(granted([legacy({ status: "EXPIRED", currentPeriodEnd: PAST })])).toEqual([]);
  });

  it("is reported as grandfathered", () => {
    const snapshot = resolveEntitlements([legacy()], NOW);
    expect(snapshot.grandfatheredPlans).toContain("legacy-one-read-umbrella");
    expect(snapshot.byProduct["one-article"].grandfathered).toBe(true);
  });

  it("an unidentified historical one-read row also stays OneArticle-only", () => {
    const unidentified = row({ productKey: "one-read", plan: "monthly" });
    expect(granted([unidentified])).toEqual(["one-article"]);
    expect(resolveEntitlements([unidentified], NOW).grandfatheredPlans).toHaveLength(1);
  });
});

describe("current standalone offers", () => {
  it.each(["monthly", "annual"] as const)(
    "OneArticle %s grants OneArticle only",
    (interval) => {
      expect(
        granted([
          row({
            productKey: "one-article",
            offerKey: "one-article",
            providerProductId: testProductId("one-article", interval),
            plan: interval,
          }),
        ]),
      ).toEqual(["one-article"]);
    },
  );

  it.each(["monthly", "annual"] as const)("OneNews %s grants OneNews only", (interval) => {
    expect(
      granted([
        row({
          productKey: "one-news",
          offerKey: "one-news",
          providerProductId: testProductId("one-news", interval),
          plan: interval,
        }),
      ]),
    ).toEqual(["one-news"]);
  });
});

describe("OneRead bundle", () => {
  it.each(["monthly", "annual"] as const)("%s grants both products", (interval) => {
    expect(
      granted([
        row({
          productKey: "one-read",
          offerKey: "one-read",
          providerProductId: testProductId("one-read", interval),
          plan: interval,
        }),
      ]),
    ).toEqual(["one-article", "one-news"]);
  });

  it("is not reported as grandfathered", () => {
    const snapshot = resolveEntitlements(
      [
        row({
          productKey: "one-read",
          offerKey: "one-read",
          providerProductId: testProductId("one-read", "monthly"),
        }),
      ],
      NOW,
    );
    expect(snapshot.grandfatheredPlans).toEqual([]);
    expect(snapshot.byProduct["one-news"].source).toBe("bundle");
  });
});

describe("multiple subscriptions per contact", () => {
  it("two active standalones grant both products without a bundle", () => {
    expect(
      granted([
        row({
          productKey: "one-article",
          offerKey: "one-article",
          providerProductId: testProductId("one-article", "monthly"),
        }),
        row({
          productKey: "one-news",
          offerKey: "one-news",
          providerProductId: testProductId("one-news", "annual"),
        }),
      ]),
    ).toEqual(["one-article", "one-news"]);
  });

  it("an expired OneNews row cannot suppress an active OneArticle row", () => {
    expect(
      granted([
        row({
          productKey: "one-news",
          offerKey: "one-news",
          status: "EXPIRED",
          currentPeriodEnd: PAST,
        }),
        row({
          productKey: "one-article",
          offerKey: "one-article",
          providerProductId: testProductId("one-article", "monthly"),
        }),
      ]),
    ).toEqual(["one-article"]);
  });
});

describe("transition overlap", () => {
  const legacyArticle = row({
    productKey: "one-article",
    offerKey: "one-article",
    providerProductId: testProductId("one-article", "monthly"),
  });
  const bundle = row({
    productKey: "one-read",
    offerKey: "one-read",
    providerProductId: testProductId("one-read", "monthly"),
  });

  it("both active grants both products", () => {
    expect(granted([legacyArticle, bundle])).toEqual(["one-article", "one-news"]);
  });

  it("after the old standalone retires, the bundle alone still grants both", () => {
    const retired = { ...legacyArticle, status: "EXPIRED", currentPeriodEnd: PAST };
    expect(granted([retired, bundle])).toEqual(["one-article", "one-news"]);
  });

  it("if the bundle never activates, legacy access is untouched", () => {
    const pendingBundle = { ...bundle, status: "PENDING_CHECKOUT", currentPeriodEnd: null };
    const legacyUmbrella = row({
      productKey: "one-read",
      providerProductId: LEGACY_ONEREAD_PRODUCT_ID,
    });
    expect(granted([legacyUmbrella, pendingBundle])).toEqual(["one-article"]);
  });
});

describe("a grandfathered subscriber never gains OneNews by accident", () => {
  it.each([
    ["no identity at all", {}],
    ["legacy provider product", { providerProductId: LEGACY_ONEREAD_PRODUCT_ID }],
    ["legacy offer key only", { offerKey: "legacy-one-read-umbrella" }],
    ["an unrecognised provider product", { providerProductId: "prod_unknown_thing" }],
    ["an unrecognised offer key", { offerKey: "one-read-v0" }],
  ])("%s", (_label, identity) => {
    const snapshot = resolveEntitlements(
      [row({ productKey: "one-read", plan: "monthly", ...identity })],
      NOW,
    );
    expect(snapshot.byProduct["one-news"].granted).toBe(false);
    expect(snapshot.byProduct["one-article"].granted).toBe(true);
  });
});
