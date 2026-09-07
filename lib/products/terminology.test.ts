import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  ALIASES,
  BRAND_NAME,
  BUNDLE_OFFER_KEY,
  IDENTITIES,
  PUBLIC_COMMERCIAL_SURFACES,
  RETIRED_TERMINOLOGY,
  displayNameFor,
  findRetiredTerminology,
  identitiesFor,
  isBundleOffer,
  offerIncludesLabel,
} from "./terminology";
import {
  OFFERS,
  OFFER_KEYS,
  PRODUCTS,
  PRODUCT_KEYS,
  isBillingIntervalKey,
  isOfferKey,
} from "./registry";

/**
 * The terminology contract. Like `contract.test.ts`, these are not unit tests
 * of behaviour — each one freezes a naming decision that used to be re-made
 * per surface, so that a surface which disagrees fails here rather than in
 * front of a subscriber.
 */

const REPO_ROOT = join(__dirname, "..", "..");

function surface(path: string): string {
  return readFileSync(join(REPO_ROOT, path), "utf8");
}

describe("canonical identities", () => {
  it("names OneRead the brand and nothing else", () => {
    expect(BRAND_NAME).toBe("OneRead");
    const brands = IDENTITIES.filter((identity) => identity.kind === "brand");
    expect(brands.map((identity) => identity.displayName)).toEqual(["OneRead"]);
  });

  it("recognises that OneRead is both the brand and the bundle offer", () => {
    const readings = identitiesFor("one-read");
    expect(readings.map((identity) => identity.kind)).toEqual(["brand", "offer"]);
  });

  it("ships exactly the two launch products", () => {
    const products = IDENTITIES.filter((identity) => identity.kind === "product");
    expect(products.map((identity) => identity.displayName)).toEqual([
      "OneArticle",
      "OneNews",
    ]);
  });

  it("takes every display name from the registry rather than restating one", () => {
    for (const key of PRODUCT_KEYS) expect(displayNameFor(key)).toBe(PRODUCTS[key].displayName);
    for (const key of OFFER_KEYS) {
      const identity = IDENTITIES.find((entry) => entry.kind === "offer" && entry.key === key);
      expect(identity?.displayName).toBe(OFFERS[key].displayName);
    }
  });

  it("returns null for a name that is not ours", () => {
    expect(displayNameFor("one-film")).toBeNull();
    expect(displayNameFor("all-access")).toBeNull();
    expect(displayNameFor(undefined)).toBeNull();
  });

  it("treats only the umbrella offer as a bundle", () => {
    expect(isBundleOffer(BUNDLE_OFFER_KEY)).toBe(true);
    for (const key of OFFER_KEYS.filter((offer) => offer !== BUNDLE_OFFER_KEY)) {
      expect(isBundleOffer(key)).toBe(false);
    }
  });

  it("derives what an offer includes from its grants", () => {
    expect(offerIncludesLabel("one-article")).toBe("OneArticle");
    expect(offerIncludesLabel(BUNDLE_OFFER_KEY)).toBe("OneArticle + OneNews");
    for (const key of OFFER_KEYS) {
      expect(offerIncludesLabel(key).split(" + ")).toHaveLength(OFFERS[key].grants.length);
    }
  });
});

describe("alias inventory", () => {
  it("maps every recorded alias onto a name the contract defines", () => {
    const canonical = new Set([
      BRAND_NAME,
      ...IDENTITIES.map((identity) => identity.displayName),
      ...IDENTITIES.map((identity) => `${identity.displayName} (${identity.kind})`),
    ]);
    for (const alias of ALIASES) expect(canonical).toContain(alias.canonical);
  });

  it("never records an alias identical to the canonical name", () => {
    for (const alias of ALIASES) expect(alias.canonical).not.toBe(alias.alias);
  });
});

describe("retired terminology stays off public commercial surfaces", () => {
  it("matches the vocabulary it claims to", () => {
    expect(findRetiredTerminology("a OneFilm note").map((entry) => entry.term)).toEqual([
      "OneFilm",
    ]);
    expect(findRetiredTerminology("$3 All Access")).not.toHaveLength(0);
    expect(findRetiredTerminology("One subscription. One dollar.")).not.toHaveLength(0);
    expect(findRetiredTerminology("the whole OneRead family")).not.toHaveLength(0);
  });

  it("still allows a grandfathering disclosure to name the closed price", () => {
    expect(findRetiredTerminology("Grandfathered $1 plan. OneArticle remains included.")).toEqual(
      [],
    );
    expect(findRetiredTerminology("OneArticle is $2 monthly or $18 annually.")).toEqual([]);
  });

  it("scans a surface list that covers the pages a subscriber buys from", () => {
    expect(PUBLIC_COMMERCIAL_SURFACES).toContain("components/PricingPageContent.tsx");
    expect(PUBLIC_COMMERCIAL_SURFACES).toContain("components/OneReadSignup.tsx");
    expect(PUBLIC_COMMERCIAL_SURFACES).toContain("lib/site-i18n.ts");
    expect(PUBLIC_COMMERCIAL_SURFACES).toContain("lib/legal-i18n.ts");
  });

  it("finds no retired terminology on any of them", () => {
    const offenders: string[] = [];
    for (const path of PUBLIC_COMMERCIAL_SURFACES) {
      for (const entry of findRetiredTerminology(surface(path))) {
        offenders.push(`${path} -> ${entry.term}: ${entry.guidance}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("names both launch products wherever the bundle is described", () => {
    for (const path of ["README.md", "app/layout.tsx", "app/manifest.ts", "lib/legal-i18n.ts"]) {
      const contents = surface(path);
      expect(contents).toContain("OneArticle");
      expect(contents).toContain("OneNews");
    }
  });

  it("keeps every retired term worth guarding", () => {
    expect(RETIRED_TERMINOLOGY.map((entry) => entry.term)).toContain("OneFilm");
    expect(RETIRED_TERMINOLOGY.map((entry) => entry.term)).toContain("All Access");
  });
});

describe("no second source of truth for what an offer includes", () => {
  const files = PUBLIC_COMMERCIAL_SURFACES.filter((path) => path.endsWith(".tsx"));

  it("hand-writes no product pairing that offerIncludesLabel already derives", () => {
    const offenders = files.filter((path) =>
      /["'`]\s*OneArticle\s*\+\s*OneNews\s*["'`]/.test(surface(path)),
    );
    expect(offenders).toEqual([]);
  });
});

/**
 * P3.2 — the acquisition and purchase surfaces.
 *
 * The terminology contract above stops a retired *name* reaching a buyer. These
 * freeze the other two ways the same surfaces drifted: a price or cadence typed
 * as a literal beside the registry that owns it, and a call to action offering
 * one plan while sending the buyer to another.
 */

/** Everything a buyer reads between the homepage and the checkout redirect. */
const ACQUISITION_SURFACES: readonly string[] = [
  "app/page.tsx",
  "app/pricing/page.tsx",
  "app/subscribe/page.tsx",
  "components/HomePageContent.tsx",
  "components/OneReadLineUp.tsx",
  "components/PricingPageContent.tsx",
  "components/OneReadSignup.tsx",
];

/**
 * A grandfathering disclosure has to name the closed $1 price to the people on
 * it. Everything else that states money on these screens is a sales claim, and
 * a sales claim must be derived.
 */
function withoutGrandfatherDisclosures(contents: string): string {
  return contents
    .split("\n")
    .filter((line) => !/grandfather/i.test(line))
    .join("\n");
}

describe("acquisition surfaces price from the registry", () => {
  it("writes no price literal into a sales surface", () => {
    const offenders: string[] = [];
    for (const path of ACQUISITION_SURFACES) {
      const matches = withoutGrandfatherDisclosures(surface(path)).match(/\$\s?\d[\d.,]*/g);
      if (matches) offenders.push(`${path} -> ${[...new Set(matches)].join(", ")}`);
    }
    expect(offenders).toEqual([]);
  });

  it("writes no discount percentage into a sales surface", () => {
    const offenders = ACQUISITION_SURFACES.filter((path) => /\d+\s?%/.test(surface(path)));
    expect(offenders).toEqual([]);
  });

  it("writes no cadence into a sales surface that the product registry owns", () => {
    const offenders: string[] = [];
    for (const path of ACQUISITION_SURFACES) {
      const contents = surface(path);
      for (const key of PRODUCT_KEYS) {
        if (contents.includes(PRODUCTS[key].cadence)) {
          offenders.push(`${path} -> ${PRODUCTS[key].cadence}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe("every offer CTA reaches the offer it names", () => {
  /** Every `/subscribe?offer=…` link written anywhere a reader can click one. */
  const LINKING_SURFACES: readonly string[] = [
    ...ACQUISITION_SURFACES,
    "app/article/subscribe/page.tsx",
    "app/samples/news/page.tsx",
    "components/ArticleLanding.tsx",
    "components/NewsLanding.tsx",
  ];

  it("names a registry offer and a registry interval in every hardcoded link", () => {
    const offenders: string[] = [];
    let found = 0;
    for (const path of LINKING_SURFACES) {
      for (const match of surface(path).matchAll(/\/subscribe\?offer=([\w-]+)(?:&interval=([\w-]+))?/g)) {
        const [, offer, interval] = match;
        // A template literal reads back as the interpolation marker, which is
        // the derived case and exactly what we want these pages to do.
        if (offer.startsWith("$")) continue;
        found += 1;
        if (!isOfferKey(offer)) offenders.push(`${path} -> unknown offer "${offer}"`);
        if (interval && !isBillingIntervalKey(interval)) {
          offenders.push(`${path} -> unknown interval "${interval}"`);
        }
      }
    }
    expect(offenders).toEqual([]);
    // Guards the guard: a regex that silently stopped matching would pass.
    expect(found).toBeGreaterThan(0);
  });

  it("carries the displayed interval into the pricing page's checkout link", () => {
    const contents = surface("components/PricingPageContent.tsx");
    expect(contents).toContain("/subscribe?offer=${offer}&interval=${interval}");
  });
});
