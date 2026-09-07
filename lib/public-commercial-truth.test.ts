import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

import { OFFERS, OFFER_KEYS, PRODUCTS, PRODUCT_ONE_NEWS } from "@/lib/products/registry";
import {
  annualEquivalenceSentence,
  offerCadenceLabel,
  offerIncludesSentence,
  offerPriceSentence,
  pricingSummarySentence,
} from "@/lib/products/pricing-copy";

const publicFiles = [
  "components/HomePageContent.tsx", "components/PricingPageContent.tsx",
  "components/OfferSummary.tsx",
  "components/OneReadSignup.tsx", "components/EditorialStandardsContent.tsx",
].map((path) => readFileSync(path, "utf8")).join("\n");

/**
 * What the public surfaces may and may not claim.
 *
 * The first test still reads the source, because a closed claim is reintroduced
 * by typing it. The second no longer does: since P3.2 these surfaces render
 * prices and cadences through `pricing-copy` rather than as literals, so
 * grepping their source for "36" would now prove the opposite of what it used
 * to. It asserts the same guarantee one layer down — that the copy those
 * surfaces render really does state every final price and the beta cadence.
 */
describe("public commercial truth", () => {
  it("does not restore closed or inaccurate claims", () => {
    expect(publicFiles).not.toMatch(/OneRead is \$1|one-click cancel|7-day free trial/i);
    expect(publicFiles).not.toMatch(/OneNews.{0,40}(every weekday|daily)/i);
  });

  it("states the six final prices in the copy these surfaces render", () => {
    const rendered = [
      pricingSummarySentence(),
      ...OFFER_KEYS.flatMap((offer) => [
        offerPriceSentence(offer, "monthly"),
        offerPriceSentence(offer, "annual"),
        annualEquivalenceSentence(offer),
      ]),
    ].join("\n");
    for (const offer of OFFER_KEYS) {
      expect(rendered).toContain(`$${OFFERS[offer].prices.monthly.amountUsd}`);
      expect(rendered).toContain(`$${OFFERS[offer].prices.annual.amountUsd}`);
    }
  });

  it("keeps the beta cadence on the products and offers that deliver it", () => {
    expect(PRODUCTS[PRODUCT_ONE_NEWS].cadence).toMatch(/Mon \/ Wed \/ Fri/);
    for (const offer of OFFER_KEYS.filter((key) => OFFERS[key].grants.includes(PRODUCT_ONE_NEWS))) {
      expect(offerCadenceLabel(offer)).toMatch(/Mon \/ Wed \/ Fri/);
      expect(offerIncludesSentence(offer)).toContain(PRODUCTS[PRODUCT_ONE_NEWS].displayName);
    }
  });
});
