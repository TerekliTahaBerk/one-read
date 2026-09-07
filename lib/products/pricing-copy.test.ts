import { describe, expect, it } from "vitest";

import {
  annualDiscountLabel,
  annualEquivalenceSentence,
  annualSavingClaim,
  entryPriceLine,
  formatUsd,
  monthlyEquivalent,
  offerAmountLabel,
  offerCadenceLabel,
  offerCadences,
  offerIncludesSentence,
  offerPriceLabel,
  offerPriceSentence,
  pricingSummarySentence,
} from "./pricing-copy";
import {
  OFFERS,
  OFFER_KEYS,
  PRODUCTS,
  PRODUCT_KEYS,
  annualDiscountPercent,
} from "./registry";
import { BUNDLE_OFFER_KEY, isBundleOffer } from "./terminology";

/**
 * These are arithmetic tests, not copy tests. Every claim this module renders
 * is a statement about money a buyer will be charged, so what is frozen here is
 * that the sentence and the sum agree — and that no sentence can quietly become
 * a literal again.
 */

describe("money formatting", () => {
  it("keeps whole dollars whole and fractions to the cent", () => {
    expect(formatUsd(18)).toBe("$18");
    expect(formatUsd(1.5)).toBe("$1.50");
    expect(formatUsd(2.25)).toBe("$2.25");
  });

  it("prices every offer from the registry rather than a literal", () => {
    for (const offer of OFFER_KEYS) {
      expect(offerAmountLabel(offer, "annual")).toBe(formatUsd(OFFERS[offer].prices.annual.amountUsd));
      expect(offerPriceLabel(offer, "monthly")).toBe(
        `${formatUsd(OFFERS[offer].prices.monthly.amountUsd)} / month`,
      );
      expect(offerPriceSentence(offer, "annual")).toBe(
        `${formatUsd(OFFERS[offer].prices.annual.amountUsd)} USD / year`,
      );
    }
  });
});

describe("the annual/monthly equivalence", () => {
  it("divides the annual price by twelve", () => {
    for (const offer of OFFER_KEYS) {
      expect(monthlyEquivalent(offer).amountUsd * 12).toBeCloseTo(
        OFFERS[offer].prices.annual.amountUsd,
        10,
      );
    }
  });

  it("states today's prices exactly, because they divide exactly", () => {
    for (const offer of OFFER_KEYS) expect(monthlyEquivalent(offer).exact).toBe(true);
    expect(annualEquivalenceSentence(BUNDLE_OFFER_KEY)).toBe("$36 billed once a year — $3 a month.");
    expect(annualEquivalenceSentence("one-article")).toBe("$18 billed once a year — $1.50 a month.");
  });

  it("never implies the yearly amount is charged monthly", () => {
    for (const offer of OFFER_KEYS) {
      const sentence = annualEquivalenceSentence(offer);
      // The charge comes first and names its own interval; the per-month figure
      // is an equivalence that follows it.
      expect(sentence.startsWith(`${formatUsd(OFFERS[offer].prices.annual.amountUsd)} billed once a year`)).toBe(true);
    }
  });
});

describe("the discount claim", () => {
  it("states a flat percentage only while every offer shares it", () => {
    const percentages = new Set(OFFER_KEYS.map(annualDiscountPercent));
    if (percentages.size === 1) {
      expect(annualDiscountLabel()).toBe(`save ${[...percentages][0]}%`);
    } else {
      expect(annualDiscountLabel()).toMatch(/^save up to \d+%$/);
    }
  });

  it("reads as a statement without losing the number", () => {
    expect(annualSavingClaim()).toBe(annualDiscountLabel().replace("save", "saves"));
  });
});

describe("cadence belongs to products", () => {
  it("gives a standalone offer the cadence of the product it grants", () => {
    for (const product of PRODUCT_KEYS) {
      expect(offerCadenceLabel(product)).toBe(PRODUCTS[product].cadence);
    }
  });

  it("gives the bundle every cadence it delivers, each named", () => {
    const label = offerCadenceLabel(BUNDLE_OFFER_KEY);
    for (const entry of offerCadences(BUNDLE_OFFER_KEY)) {
      expect(label).toContain(entry.displayName);
      expect(label).toContain(entry.cadence);
    }
  });

  it("invents no cadence an offer does not deliver", () => {
    for (const offer of OFFER_KEYS) {
      expect(offerCadences(offer).map((entry) => entry.product)).toEqual([...OFFERS[offer].grants]);
    }
  });
});

describe("what an offer includes", () => {
  it("says so explicitly for the bundle", () => {
    const sentence = offerIncludesSentence(BUNDLE_OFFER_KEY);
    for (const product of OFFERS[BUNDLE_OFFER_KEY].grants) {
      expect(sentence).toContain(PRODUCTS[product].displayName);
    }
  });

  it("does not let a standalone offer imply it includes the other product", () => {
    for (const offer of OFFER_KEYS.filter((key) => !isBundleOffer(key))) {
      const sentence = offerIncludesSentence(offer);
      const excluded = PRODUCT_KEYS.filter((product) => !OFFERS[offer].grants.includes(product));
      for (const product of excluded) expect(sentence).not.toContain(PRODUCTS[product].displayName);
    }
  });
});

describe("whole-surface copy", () => {
  it("names every offer and its entry price on the homepage line", () => {
    const line = entryPriceLine();
    for (const offer of OFFER_KEYS) {
      expect(line).toContain(OFFERS[offer].displayName);
      expect(line).toContain(formatUsd(OFFERS[offer].prices.annual.amountUsd));
    }
  });

  it("states both prices for every offer in the pricing description", () => {
    const summary = pricingSummarySentence();
    for (const offer of OFFER_KEYS) {
      expect(summary).toContain(formatUsd(OFFERS[offer].prices.monthly.amountUsd));
      expect(summary).toContain(formatUsd(OFFERS[offer].prices.annual.amountUsd));
    }
  });

  it("says what the bundle bundles wherever it names it", () => {
    for (const copy of [entryPriceLine(), pricingSummarySentence()]) {
      for (const product of OFFERS[BUNDLE_OFFER_KEY].grants) {
        expect(copy).toContain(PRODUCTS[product].displayName);
      }
    }
  });
});
