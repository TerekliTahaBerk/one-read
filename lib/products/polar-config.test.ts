import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  MissingPolarOfferConfigError,
  checkoutEnvVar,
  describeOfferConfig,
  isLegacyProviderProductId,
  isOfferConfigured,
  missingOfferConfig,
  resolveCheckoutProductId,
  resolveOfferFromProviderProductId,
} from "@/lib/products/polar-config";
import { OFFER_KEYS, BILLING_INTERVAL_KEYS } from "@/lib/products/registry";

/** The historical hard-coded OneArticle product, still live in Polar. */
const LEGACY_ARTICLE_ID = "44ef8bae-87eb-40eb-9a07-8b4a97e1434e";
const LEGACY_UMBRELLA_ID = "legacy-umbrella-product-id";

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
});

afterEach(() => {
  for (const [name, value] of saved) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
  saved.clear();
});

function configureFullMatrix() {
  for (const offer of OFFER_KEYS) {
    for (const interval of BILLING_INTERVAL_KEYS) {
      process.env[checkoutEnvVar(offer, interval)] = `prod_${offer}_${interval}`;
    }
  }
}

describe("checkout product resolution (outbound, fail-closed)", () => {
  it("resolves every configured offer/interval to its own product id", () => {
    configureFullMatrix();
    expect(resolveCheckoutProductId("one-article", "monthly")).toBe("prod_one-article_monthly");
    expect(resolveCheckoutProductId("one-article", "annual")).toBe("prod_one-article_annual");
    expect(resolveCheckoutProductId("one-news", "monthly")).toBe("prod_one-news_monthly");
    expect(resolveCheckoutProductId("one-news", "annual")).toBe("prod_one-news_annual");
    expect(resolveCheckoutProductId("one-read", "monthly")).toBe("prod_one-read_monthly");
    expect(resolveCheckoutProductId("one-read", "annual")).toBe("prod_one-read_annual");
  });

  it("throws naming the missing environment variable instead of falling back", () => {
    configureFullMatrix();
    delete process.env.POLAR_ONE_NEWS_ANNUAL_PRODUCT_ID;

    expect(() => resolveCheckoutProductId("one-news", "annual")).toThrowError(
      MissingPolarOfferConfigError,
    );
    expect(() => resolveCheckoutProductId("one-news", "annual")).toThrowError(
      /POLAR_ONE_NEWS_ANNUAL_PRODUCT_ID/,
    );
  });

  it("never substitutes another offer's product id for an unconfigured one", () => {
    process.env.POLAR_ONE_ARTICLE_MONTHLY_PRODUCT_ID = "prod_article_monthly";
    // Annual is unset. It must fail, not silently bill the monthly product.
    expect(() => resolveCheckoutProductId("one-article", "annual")).toThrow();
  });

  it("treats a blank environment variable as unconfigured", () => {
    configureFullMatrix();
    process.env.POLAR_ONE_READ_ANNUAL_PRODUCT_ID = "   ";
    expect(isOfferConfigured("one-read", "annual")).toBe(false);
    expect(() => resolveCheckoutProductId("one-read", "annual")).toThrow();
  });

  it("never offers a legacy product for a new checkout", () => {
    process.env.POLAR_ONEREAD_PRODUCT_ID = LEGACY_UMBRELLA_ID;
    process.env.POLAR_ONE_ARTICLE_PRODUCT_ID = LEGACY_ARTICLE_ID;

    // With no new-offer variables set, every checkout must fail closed rather
    // than reaching for the legacy ids that are configured and available.
    for (const offer of OFFER_KEYS) {
      for (const interval of BILLING_INTERVAL_KEYS) {
        expect(() => resolveCheckoutProductId(offer, interval)).toThrow();
      }
    }
  });

  it("reports the full set of missing commercial identifiers", () => {
    expect(missingOfferConfig()).toHaveLength(6);
    configureFullMatrix();
    expect(missingOfferConfig()).toEqual([]);
  });
});

describe("provider product resolution (inbound)", () => {
  it("identifies current offers with their billing interval", () => {
    configureFullMatrix();
    expect(resolveOfferFromProviderProductId("prod_one-read_annual")).toEqual({
      legacy: false,
      offer: "one-read",
      interval: "annual",
      subscriptionProductKey: "one-read",
      grants: ["one-article", "one-news"],
    });
    expect(resolveOfferFromProviderProductId("prod_one-news_monthly")).toEqual({
      legacy: false,
      offer: "one-news",
      interval: "monthly",
      subscriptionProductKey: "one-news",
      grants: ["one-news"],
    });
  });

  it("recognises the legacy $1 umbrella and grants OneArticle only", () => {
    process.env.POLAR_ONEREAD_PRODUCT_ID = LEGACY_UMBRELLA_ID;
    const resolved = resolveOfferFromProviderProductId(LEGACY_UMBRELLA_ID);

    expect(resolved).toEqual({
      legacy: true,
      legacyKey: "legacy-one-read-umbrella",
      subscriptionProductKey: "one-read",
      grants: ["one-article"],
    });
    // The critical guarantee: the historical umbrella must not become today's
    // bundle and hand a $1 subscriber OneNews for free.
    expect(resolved?.grants).not.toContain("one-news");
  });

  it("recognises the legacy standalone OneArticle product without configuration", () => {
    expect(resolveOfferFromProviderProductId(LEGACY_ARTICLE_ID)).toEqual({
      legacy: true,
      legacyKey: "legacy-one-article-standalone",
      subscriptionProductKey: "one-article",
      grants: ["one-article"],
    });
  });

  it("keeps recognising legacy subscriptions after the full new matrix ships", () => {
    configureFullMatrix();
    process.env.POLAR_ONEREAD_PRODUCT_ID = LEGACY_UMBRELLA_ID;

    expect(isLegacyProviderProductId(LEGACY_UMBRELLA_ID)).toBe(true);
    expect(isLegacyProviderProductId(LEGACY_ARTICLE_ID)).toBe(true);
    expect(isLegacyProviderProductId("prod_one-read_monthly")).toBe(false);
  });

  it("prefers a current offer when a product id is configured as both", () => {
    configureFullMatrix();
    process.env.POLAR_ONEREAD_PRODUCT_ID = "prod_one-read_monthly";
    const resolved = resolveOfferFromProviderProductId("prod_one-read_monthly");
    expect(resolved).toMatchObject({ legacy: false, offer: "one-read", interval: "monthly" });
  });

  it("returns null for unknown, empty and absent product ids", () => {
    configureFullMatrix();
    expect(resolveOfferFromProviderProductId("prod_someone_elses_product")).toBeNull();
    expect(resolveOfferFromProviderProductId("")).toBeNull();
    expect(resolveOfferFromProviderProductId("   ")).toBeNull();
    expect(resolveOfferFromProviderProductId(null)).toBeNull();
    expect(resolveOfferFromProviderProductId(undefined)).toBeNull();
  });
});

describe("describeOfferConfig", () => {
  it("reports configured and missing offers for operator display", () => {
    process.env.POLAR_ONE_ARTICLE_MONTHLY_PRODUCT_ID = "prod_a";
    const described = describeOfferConfig();

    expect(described.current).toHaveLength(6);
    expect(
      described.current.find((row) => row.offer === "one-article" && row.interval === "monthly"),
    ).toMatchObject({ configured: true, envVar: "POLAR_ONE_ARTICLE_MONTHLY_PRODUCT_ID" });
    expect(described.missing).toContain("POLAR_ONE_NEWS_ANNUAL_PRODUCT_ID");
    expect(described.legacy.map((entry) => entry.key)).toEqual([
      "legacy-one-read-umbrella",
      "legacy-one-article-standalone",
    ]);
  });
});
