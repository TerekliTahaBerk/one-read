import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  classifySubscription,
  improveClassification,
  persistableOfferKey,
} from "@/lib/products/classification";
import {
  LEGACY_ONEREAD_PRODUCT_ID,
  LEGACY_ONE_ARTICLE_PRODUCT_ID,
  clearOfferEnv,
  configureAllOffers,
  testProductId,
} from "@/test/fixtures/polar-offers";

beforeEach(() => configureAllOffers());
afterEach(() => clearOfferEnv());

describe("classifySubscription — provider product is the strongest evidence", () => {
  it.each([
    ["one-article", "monthly"],
    ["one-article", "annual"],
    ["one-news", "monthly"],
    ["one-news", "annual"],
    ["one-read", "monthly"],
    ["one-read", "annual"],
  ] as const)("identifies current %s %s exactly", (offer, interval) => {
    const result = classifySubscription({
      productKey: offer,
      offerKey: offer,
      providerProductId: testProductId(offer, interval),
      plan: interval,
    });

    expect(result).toMatchObject({
      kind: "current",
      offer,
      interval,
      grandfathered: false,
      evidence: "provider_product",
    });
  });

  it("pins the interval from the provider product even when `plan` disagrees", () => {
    const result = classifySubscription({
      productKey: "one-read",
      providerProductId: testProductId("one-read", "annual"),
      // A stale local value; provider truth must win.
      plan: "monthly",
    });
    expect(result.interval).toBe("annual");
  });

  it("bundle grants both products", () => {
    const result = classifySubscription({
      productKey: "one-read",
      providerProductId: testProductId("one-read", "monthly"),
    });
    expect(result.grants).toEqual(["one-article", "one-news"]);
  });
});

describe("classifySubscription — the legacy $1 ambiguity", () => {
  it("classifies the legacy umbrella as legacy, granting OneArticle only", () => {
    const result = classifySubscription({
      productKey: "one-read",
      providerProductId: LEGACY_ONEREAD_PRODUCT_ID,
      plan: "monthly",
    });

    expect(result).toMatchObject({
      kind: "legacy",
      legacyKey: "legacy-one-read-umbrella",
      grandfathered: true,
    });
    expect(result.grants).toEqual(["one-article"]);
    expect(result.grants).not.toContain("one-news");
  });

  it("never treats an unidentified one-read row as the current bundle", () => {
    const result = classifySubscription({ productKey: "one-read", plan: "monthly" });

    expect(result.kind).toBe("unknown");
    expect(result.grandfathered).toBe(true);
    expect(result.grants).toEqual(["one-article"]);
    expect(result.grants).not.toContain("one-news");
  });

  it("recognises the legacy standalone OneArticle product with no env configured", () => {
    clearOfferEnv();
    const result = classifySubscription({
      productKey: "one-article",
      providerProductId: LEGACY_ONE_ARTICLE_PRODUCT_ID,
    });
    expect(result).toMatchObject({ kind: "legacy", grandfathered: true });
    expect(result.grants).toEqual(["one-article"]);
  });

  it("treats unidentified one-article / one-news rows as unambiguous, not grandfathered", () => {
    for (const productKey of ["one-article", "one-news"] as const) {
      const result = classifySubscription({ productKey });
      expect(result.kind).toBe("unknown");
      expect(result.grandfathered).toBe(false);
      expect(result.grants).toEqual([productKey]);
    }
  });
});

describe("classifySubscription — offerKey as second-strongest evidence", () => {
  it("uses a persisted current offer key when no provider product is known", () => {
    const result = classifySubscription({
      productKey: "one-read",
      offerKey: "one-read",
      plan: "annual",
    });
    expect(result).toMatchObject({
      kind: "current",
      offer: "one-read",
      interval: "annual",
      evidence: "offer_key",
    });
    expect(result.grants).toEqual(["one-article", "one-news"]);
  });

  it("uses a persisted legacy offer key", () => {
    const result = classifySubscription({
      productKey: "one-read",
      offerKey: "legacy-one-read-umbrella",
    });
    expect(result).toMatchObject({ kind: "legacy", grandfathered: true, evidence: "offer_key" });
    expect(result.grants).toEqual(["one-article"]);
  });

  it("falls back to conservative inference for an unrecognised offer key", () => {
    const result = classifySubscription({
      productKey: "one-read",
      offerKey: "some-retired-key",
    });
    expect(result.kind).toBe("unknown");
    expect(result.grants).toEqual(["one-article"]);
  });

  it("provider evidence overrides a disagreeing persisted offer key", () => {
    const result = classifySubscription({
      productKey: "one-read",
      offerKey: "one-read",
      providerProductId: LEGACY_ONEREAD_PRODUCT_ID,
    });
    expect(result).toMatchObject({ kind: "legacy", evidence: "provider_product" });
    expect(result.grants).toEqual(["one-article"]);
  });
});

describe("persistableOfferKey", () => {
  it("returns a key for identified rows and null for unknown ones", () => {
    expect(
      persistableOfferKey(
        classifySubscription({ providerProductId: testProductId("one-news", "annual"), productKey: "one-news" }),
      ),
    ).toBe("one-news");
    expect(
      persistableOfferKey(
        classifySubscription({ providerProductId: LEGACY_ONEREAD_PRODUCT_ID, productKey: "one-read" }),
      ),
    ).toBe("legacy-one-read-umbrella");
    expect(persistableOfferKey(classifySubscription({ productKey: "one-read" }))).toBeNull();
  });
});

describe("improveClassification — evidence may only strengthen", () => {
  it("resolves a previously unidentified legacy row when the product id appears", () => {
    const result = improveClassification(
      { productKey: "one-read" },
      LEGACY_ONEREAD_PRODUCT_ID,
    );
    expect(result.improved).toBe(true);
    expect(result.data).toEqual({
      offerKey: "legacy-one-read-umbrella",
      providerProductId: LEGACY_ONEREAD_PRODUCT_ID,
    });
  });

  it("upgrades an offerKey-only row to provider evidence", () => {
    const result = improveClassification(
      { productKey: "one-read", offerKey: "one-read" },
      testProductId("one-read", "monthly"),
    );
    expect(result.improved).toBe(true);
    expect(result.data.offerKey).toBe("one-read");
  });

  it("refuses to record a product id that resolves to nothing we sell", () => {
    const result = improveClassification({ productKey: "one-read" }, "prod_someone_elses");
    expect(result).toMatchObject({ improved: false, reason: "unidentifiable" });
    expect(result.data).toEqual({});
  });

  it("is a no-op when the row already carries that provider product", () => {
    const productId = testProductId("one-article", "monthly");
    const result = improveClassification(
      { productKey: "one-article", offerKey: "one-article", providerProductId: productId },
      productId,
    );
    expect(result).toMatchObject({ improved: false, reason: "not_stronger" });
  });

  it("cannot erase an established classification when no product id is present", () => {
    const productId = testProductId("one-read", "monthly");
    const result = improveClassification(
      { productKey: "one-read", offerKey: "one-read", providerProductId: productId },
      null,
    );
    expect(result.improved).toBe(false);
    expect(result.data).toEqual({});
  });
});
