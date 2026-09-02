import { describe, expect, it } from "vitest";
import {
  OFFERS,
  OFFER_KEYS,
  OFFER_ONE_ARTICLE,
  OFFER_ONE_NEWS,
  OFFER_ONE_READ_BUNDLE,
  PRODUCT_KEYS,
  PRODUCT_ONE_ARTICLE,
  PRODUCT_ONE_NEWS,
  annualSavingUsd,
  billingIntervalFromProviderInterval,
  isOfferKey,
  offerGrantsProduct,
  offersGrantingProduct,
  parseOfferSelection,
  productsGrantedByOffer,
} from "@/lib/products/registry";

describe("product registry", () => {
  it("sells exactly OneArticle, OneNews and the OneRead bundle", () => {
    expect([...OFFER_KEYS]).toEqual(["one-article", "one-news", "one-read"]);
    expect([...PRODUCT_KEYS]).toEqual(["one-article", "one-news"]);
  });

  it("prices the published commercial matrix", () => {
    expect(OFFERS[OFFER_ONE_ARTICLE].prices.monthly.amountUsd).toBe(2);
    expect(OFFERS[OFFER_ONE_ARTICLE].prices.annual.amountUsd).toBe(18);
    expect(OFFERS[OFFER_ONE_NEWS].prices.monthly.amountUsd).toBe(3);
    expect(OFFERS[OFFER_ONE_NEWS].prices.annual.amountUsd).toBe(27);
    expect(OFFERS[OFFER_ONE_READ_BUNDLE].prices.monthly.amountUsd).toBe(4);
    expect(OFFERS[OFFER_ONE_READ_BUNDLE].prices.annual.amountUsd).toBe(36);
  });

  it("derives annual savings rather than hard-coding them in copy", () => {
    expect(annualSavingUsd(OFFER_ONE_ARTICLE)).toBe(6);
    expect(annualSavingUsd(OFFER_ONE_NEWS)).toBe(9);
    expect(annualSavingUsd(OFFER_ONE_READ_BUNDLE)).toBe(12);
  });

  it("offers every product on both monthly and annual billing", () => {
    for (const offer of OFFER_KEYS) {
      expect(OFFERS[offer].prices.monthly.providerInterval).toBe("month");
      expect(OFFERS[offer].prices.annual.providerInterval).toBe("year");
    }
  });

  it("grants both products for the bundle and one for each standalone offer", () => {
    expect(productsGrantedByOffer(OFFER_ONE_ARTICLE)).toEqual([PRODUCT_ONE_ARTICLE]);
    expect(productsGrantedByOffer(OFFER_ONE_NEWS)).toEqual([PRODUCT_ONE_NEWS]);
    expect(productsGrantedByOffer(OFFER_ONE_READ_BUNDLE)).toEqual([
      PRODUCT_ONE_ARTICLE,
      PRODUCT_ONE_NEWS,
    ]);
  });

  it("grants nothing for an unknown offer", () => {
    expect(productsGrantedByOffer("one-film")).toEqual([]);
    expect(offerGrantsProduct("one-film", PRODUCT_ONE_ARTICLE)).toBe(false);
    expect(isOfferKey("one-film")).toBe(false);
  });

  it("lists the bundle alongside the standalone offer for each product", () => {
    expect(offersGrantingProduct(PRODUCT_ONE_ARTICLE)).toEqual(["one-article", "one-read"]);
    expect(offersGrantingProduct(PRODUCT_ONE_NEWS)).toEqual(["one-news", "one-read"]);
  });
});

describe("parseOfferSelection", () => {
  it("accepts every supported offer/interval pair", () => {
    for (const offer of OFFER_KEYS) {
      for (const interval of ["monthly", "annual"] as const) {
        expect(parseOfferSelection(offer, interval)).toEqual({ offer, interval });
      }
    }
  });

  it("rejects an arbitrary provider product id supplied by the browser", () => {
    expect(parseOfferSelection("44ef8bae-87eb-40eb-9a07-8b4a97e1434e", "monthly")).toBeNull();
  });

  it("rejects unknown offers, unknown intervals and non-strings", () => {
    expect(parseOfferSelection("one-film", "monthly")).toBeNull();
    expect(parseOfferSelection("one-article", "weekly")).toBeNull();
    expect(parseOfferSelection("one-article", "lifetime")).toBeNull();
    expect(parseOfferSelection(null, "monthly")).toBeNull();
    expect(parseOfferSelection("one-article", undefined)).toBeNull();
    expect(parseOfferSelection({ offer: "one-article" }, "monthly")).toBeNull();
  });
});

describe("billingIntervalFromProviderInterval", () => {
  it("maps Polar month and year vocabularies onto our interval keys", () => {
    expect(billingIntervalFromProviderInterval("month")).toBe("monthly");
    expect(billingIntervalFromProviderInterval("monthly")).toBe("monthly");
    expect(billingIntervalFromProviderInterval("year")).toBe("annual");
    expect(billingIntervalFromProviderInterval("yearly")).toBe("annual");
    expect(billingIntervalFromProviderInterval("annual")).toBe("annual");
    expect(billingIntervalFromProviderInterval("YEAR")).toBe("annual");
  });

  it("returns null for unknown or absent intervals instead of guessing monthly", () => {
    expect(billingIntervalFromProviderInterval("week")).toBeNull();
    expect(billingIntervalFromProviderInterval(null)).toBeNull();
    expect(billingIntervalFromProviderInterval(undefined)).toBeNull();
  });
});
