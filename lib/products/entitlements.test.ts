import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  hasProductAccess,
  isGrandfathered,
  resolveEntitlements,
  resolveProductEntitlement,
  type EntitlementSubscriptionInput,
} from "@/lib/products/entitlements";
import { checkoutEnvVar } from "@/lib/products/polar-config";
import { BILLING_INTERVAL_KEYS, OFFER_KEYS } from "@/lib/products/registry";

const NOW = new Date("2026-09-02T12:00:00.000Z");
const NEXT_MONTH = new Date("2026-10-02T12:00:00.000Z");
const LAST_MONTH = new Date("2026-08-02T12:00:00.000Z");

const LEGACY_UMBRELLA_ID = "legacy-umbrella-product-id";
const LEGACY_ARTICLE_ID = "44ef8bae-87eb-40eb-9a07-8b4a97e1434e";

const OWNED_ENV_VARS = [
  ...OFFER_KEYS.flatMap((offer) =>
    BILLING_INTERVAL_KEYS.map((interval) => checkoutEnvVar(offer, interval)),
  ),
  "POLAR_ONEREAD_PRODUCT_ID",
  "POLAR_ONE_ARTICLE_PRODUCT_ID",
];

const saved = new Map<string, string | undefined>();

beforeEach(() => {
  for (const name of OWNED_ENV_VARS) {
    saved.set(name, process.env[name]);
    delete process.env[name];
  }
  for (const offer of OFFER_KEYS) {
    for (const interval of BILLING_INTERVAL_KEYS) {
      process.env[checkoutEnvVar(offer, interval)] = `prod_${offer}_${interval}`;
    }
  }
  process.env.POLAR_ONEREAD_PRODUCT_ID = LEGACY_UMBRELLA_ID;
});

afterEach(() => {
  for (const [name, value] of saved) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
  saved.clear();
});

/* ------------------------------- fixtures -------------------------------- */

const activeBase = {
  status: "ACTIVE_PAID",
  paymentProvider: "polar",
  adminOverride: false,
  trialEndsAt: null,
  currentPeriodEnd: NEXT_MONTH,
  pastDueAt: null,
} satisfies Omit<EntitlementSubscriptionInput, "productKey">;

/** The mission-critical fixture: an existing $1 OneRead umbrella subscriber. */
const legacyUmbrellaActive: EntitlementSubscriptionInput = {
  ...activeBase,
  productKey: "one-read",
  providerProductId: LEGACY_UMBRELLA_ID,
};

const legacyUmbrellaCancelAtPeriodEnd: EntitlementSubscriptionInput = {
  ...legacyUmbrellaActive,
  status: "CANCELED",
  currentPeriodEnd: NEXT_MONTH,
};

const legacyUmbrellaPastDue: EntitlementSubscriptionInput = {
  ...legacyUmbrellaActive,
  status: "PAST_DUE",
  pastDueAt: new Date("2026-09-01T12:00:00.000Z"),
};

const legacyArticleStandalone: EntitlementSubscriptionInput = {
  ...activeBase,
  productKey: "one-article",
  providerProductId: LEGACY_ARTICLE_ID,
};

const newArticleMonthly: EntitlementSubscriptionInput = {
  ...activeBase,
  productKey: "one-article",
  providerProductId: "prod_one-article_monthly",
};

const newArticleAnnual: EntitlementSubscriptionInput = {
  ...activeBase,
  productKey: "one-article",
  providerProductId: "prod_one-article_annual",
};

const newsMonthly: EntitlementSubscriptionInput = {
  ...activeBase,
  productKey: "one-news",
  providerProductId: "prod_one-news_monthly",
};

const bundleAnnual: EntitlementSubscriptionInput = {
  ...activeBase,
  productKey: "one-read",
  providerProductId: "prod_one-read_annual",
};

/* ----------------------------- grandfathering ---------------------------- */

describe("grandfathered legacy subscribers", () => {
  it("keeps OneArticle access for an active legacy $1 umbrella subscriber", () => {
    const snapshot = resolveEntitlements([legacyUmbrellaActive], NOW);

    expect(snapshot.byProduct["one-article"]).toEqual({
      product: "one-article",
      granted: true,
      reason: "ok",
      source: "legacy",
      grandfathered: true,
    });
  });

  it("does NOT give a legacy $1 umbrella subscriber the new bundle's OneNews", () => {
    const snapshot = resolveEntitlements([legacyUmbrellaActive], NOW);

    expect(snapshot.byProduct["one-news"].granted).toBe(false);
    expect(snapshot.hasAnyAccess).toBe(true);
  });

  it("keeps OneArticle access for a legacy standalone OneArticle subscriber", () => {
    const snapshot = resolveEntitlements([legacyArticleStandalone], NOW);

    expect(snapshot.byProduct["one-article"].granted).toBe(true);
    expect(snapshot.byProduct["one-article"].grandfathered).toBe(true);
    expect(snapshot.byProduct["one-news"].granted).toBe(false);
  });

  it("keeps legacy access through the paid period after cancel-at-period-end", () => {
    expect(hasProductAccess([legacyUmbrellaCancelAtPeriodEnd], "one-article", NOW)).toBe(true);
  });

  it("ends legacy access once the canceled period has elapsed", () => {
    const entitlement = resolveProductEntitlement(
      [{ ...legacyUmbrellaCancelAtPeriodEnd, currentPeriodEnd: LAST_MONTH }],
      "one-article",
      NOW,
    );

    expect(entitlement.granted).toBe(false);
    expect(entitlement.reason).toBe("canceled_expired");
  });

  it("keeps legacy access inside the past-due grace window", () => {
    expect(hasProductAccess([legacyUmbrellaPastDue], "one-article", NOW)).toBe(true);
  });

  it("ends legacy access after the past-due grace window", () => {
    const entitlement = resolveProductEntitlement(
      [{ ...legacyUmbrellaPastDue, pastDueAt: new Date("2026-08-01T12:00:00.000Z") }],
      "one-article",
      NOW,
    );

    expect(entitlement.granted).toBe(false);
    expect(entitlement.reason).toBe("past_due_grace_ended");
  });

  it("flags grandfathered plans so upgrade flows can demand deliberate consent", () => {
    expect(isGrandfathered([legacyUmbrellaActive], NOW)).toBe(true);
    expect(resolveEntitlements([legacyUmbrellaActive], NOW).grandfatheredPlans).toEqual([
      "legacy-one-read-umbrella",
    ]);

    expect(isGrandfathered([bundleAnnual], NOW)).toBe(false);
    expect(isGrandfathered([newArticleMonthly], NOW)).toBe(false);
  });

  it("treats an unidentified one-read row as the legacy umbrella, not the bundle", () => {
    // Rows written before provider product ids were recorded must never be
    // assumed to be the $4 bundle: under-granting is recoverable, silently
    // giving away OneNews is not.
    const unidentified: EntitlementSubscriptionInput = { ...activeBase, productKey: "one-read" };
    const snapshot = resolveEntitlements([unidentified], NOW);

    expect(snapshot.byProduct["one-article"].granted).toBe(true);
    expect(snapshot.byProduct["one-news"].granted).toBe(false);
    expect(snapshot.byProduct["one-article"].grandfathered).toBe(true);
  });
});

/* ------------------------------ new offers ------------------------------- */

describe("current offers", () => {
  it("grants OneArticle only for a new OneArticle monthly subscription", () => {
    const snapshot = resolveEntitlements([newArticleMonthly], NOW);

    expect(snapshot.byProduct["one-article"]).toMatchObject({
      granted: true,
      source: "standalone",
      grandfathered: false,
    });
    expect(snapshot.byProduct["one-news"].granted).toBe(false);
  });

  it("grants OneArticle for a new OneArticle annual subscription", () => {
    expect(hasProductAccess([newArticleAnnual], "one-article", NOW)).toBe(true);
    expect(hasProductAccess([newArticleAnnual], "one-news", NOW)).toBe(false);
  });

  it("grants OneNews only for a OneNews standalone subscription", () => {
    expect(hasProductAccess([newsMonthly], "one-news", NOW)).toBe(true);
    expect(hasProductAccess([newsMonthly], "one-article", NOW)).toBe(false);
  });

  it("grants BOTH products for the OneRead bundle", () => {
    const snapshot = resolveEntitlements([bundleAnnual], NOW);

    expect(snapshot.byProduct["one-article"]).toMatchObject({
      granted: true,
      source: "bundle",
      grandfathered: false,
    });
    expect(snapshot.byProduct["one-news"]).toMatchObject({ granted: true, source: "bundle" });
  });

  it("removes both entitlements once a canceled bundle period has elapsed", () => {
    const expired = { ...bundleAnnual, status: "CANCELED", currentPeriodEnd: LAST_MONTH };
    const snapshot = resolveEntitlements([expired], NOW);

    expect(snapshot.byProduct["one-article"].granted).toBe(false);
    expect(snapshot.byProduct["one-news"].granted).toBe(false);
    expect(snapshot.hasAnyAccess).toBe(false);
  });

  it("requires provider confirmation before granting access", () => {
    const unconfirmed = { ...newArticleMonthly, paymentProvider: null };
    expect(resolveProductEntitlement([unconfirmed], "one-article", NOW)).toMatchObject({
      granted: false,
      reason: "subscription_not_confirmed",
    });
  });

  it("grants access for an admin override without a payment provider", () => {
    const comped: EntitlementSubscriptionInput = {
      ...activeBase,
      status: "ADMIN_OVERRIDE",
      paymentProvider: null,
      adminOverride: true,
      productKey: "one-news",
      providerProductId: null,
    };
    expect(resolveProductEntitlement([comped], "one-news", NOW)).toMatchObject({
      granted: true,
      source: "admin_override",
    });
  });
});

/* --------------------------- multi-row contacts -------------------------- */

describe("contacts holding several subscriptions", () => {
  it("combines a standalone OneArticle with a standalone OneNews", () => {
    const snapshot = resolveEntitlements([newArticleMonthly, newsMonthly], NOW);

    expect(snapshot.byProduct["one-article"].granted).toBe(true);
    expect(snapshot.byProduct["one-news"].granted).toBe(true);
  });

  it("keeps legacy OneArticle access while a separate bundle row is still pending", () => {
    // The upgrade window: the bundle checkout exists but has not activated.
    // Access must come from the legacy row and must not gap.
    const pendingBundle: EntitlementSubscriptionInput = {
      ...activeBase,
      status: "PENDING_CHECKOUT",
      productKey: "one-read",
      providerProductId: "prod_one-read_monthly",
      currentPeriodEnd: null,
    };
    const snapshot = resolveEntitlements([legacyArticleStandalone, pendingBundle], NOW);

    expect(snapshot.byProduct["one-article"].granted).toBe(true);
    expect(snapshot.byProduct["one-news"].granted).toBe(false);
  });

  it("grants OneNews once the bundle activates alongside the legacy row", () => {
    const snapshot = resolveEntitlements([legacyArticleStandalone, bundleAnnual], NOW);

    expect(snapshot.byProduct["one-article"].granted).toBe(true);
    expect(snapshot.byProduct["one-news"].granted).toBe(true);
  });

  it("never lets an expired subscription suppress access granted by another", () => {
    const expiredNews = { ...newsMonthly, status: "EXPIRED" };
    const snapshot = resolveEntitlements([expiredNews, bundleAnnual], NOW);

    expect(snapshot.byProduct["one-news"].granted).toBe(true);
    expect(snapshot.byProduct["one-article"].granted).toBe(true);
  });

  it("reports a specific refusal reason rather than a generic one", () => {
    const pastDueArticle = {
      ...newArticleMonthly,
      status: "PAST_DUE",
      pastDueAt: new Date("2026-08-01T12:00:00.000Z"),
    };
    expect(resolveProductEntitlement([pastDueArticle], "one-article", NOW).reason).toBe(
      "past_due_grace_ended",
    );
  });

  it("denies everything for a contact with no subscriptions", () => {
    const snapshot = resolveEntitlements([], NOW);

    expect(snapshot.hasAnyAccess).toBe(false);
    expect(snapshot.byProduct["one-article"]).toMatchObject({
      granted: false,
      reason: "checkout_required",
      source: null,
    });
    expect(snapshot.grandfatheredPlans).toEqual([]);
  });

  it("ignores subscriptions to retired products entirely", () => {
    const oneFilm: EntitlementSubscriptionInput = { ...activeBase, productKey: "one-film" };
    const snapshot = resolveEntitlements([oneFilm], NOW);

    expect(snapshot.hasAnyAccess).toBe(false);
  });
});
