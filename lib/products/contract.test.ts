import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

import {
  OFFERS,
  OFFER_KEYS,
  PRODUCT_KEYS,
  PRODUCT_ONE_ARTICLE,
  PRODUCT_ONE_NEWS,
  annualDiscountPercent,
  productsGrantedByOffer,
} from "./registry";
import {
  LEGACY_OFFERS,
  allLegacyProductIds,
  checkoutEnvVar,
  checkoutEnvVarNames,
  legacyProductIdFor,
} from "./polar-config";
import { PRICING } from "@/lib/options";
import { ONE_READ_INCLUDED_PRODUCT_KEYS } from "@/lib/oneread/config";
import { validatePublicLaunchConfiguration } from "@/lib/launch-config";

/**
 * The launch contract: one definition of what is sold, at what price, against
 * which Polar product, granting which editorial products.
 *
 * These are not unit tests of behaviour — each one pins a fact that used to be
 * written down in more than one file, so that reintroducing the second copy
 * fails here rather than in production billing.
 */

const REPO_ROOT = join(__dirname, "..", "..");
const SCANNED_DIRS = ["app", "components", "lib", "scripts"];
/** Files allowed to name Polar product ids and their variables. */
const REGISTRY_FILES = ["lib/products/polar-config.ts", "lib/products/registry.ts"];

function sourceFiles(): string[] {
  const found: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      if (entry === "node_modules" || entry.startsWith(".")) continue;
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.(ts|tsx|mjs)$/.test(entry) && !/\.test\.tsx?$/.test(entry)) found.push(full);
    }
  };
  for (const dir of SCANNED_DIRS) walk(join(REPO_ROOT, dir));
  return found;
}

describe("launch offer contract", () => {
  it("sells exactly the offers the registry defines, each with both intervals", () => {
    expect([...OFFER_KEYS]).toEqual(["one-article", "one-news", "one-read"]);
    for (const offer of OFFER_KEYS) {
      expect(OFFERS[offer].prices.monthly.amountUsd).toBeGreaterThan(0);
      expect(OFFERS[offer].prices.annual.amountUsd).toBeGreaterThan(0);
    }
  });

  it("gives every (offer, interval) its own environment variable", () => {
    const names = checkoutEnvVarNames();
    expect(names).toHaveLength(OFFER_KEYS.length * 2);
    expect(new Set(names).size).toBe(names.length);
  });

  it("grants OneArticle and OneNews only through offers that include them", () => {
    expect(productsGrantedByOffer("one-article")).toEqual([PRODUCT_ONE_ARTICLE]);
    expect(productsGrantedByOffer("one-news")).toEqual([PRODUCT_ONE_NEWS]);
    expect([...productsGrantedByOffer("one-read")]).toEqual([...PRODUCT_KEYS]);
  });

  it("prices annual below twelve months of monthly for every offer", () => {
    for (const offer of OFFER_KEYS) {
      expect(annualDiscountPercent(offer)).toBeGreaterThan(0);
      expect(annualDiscountPercent(offer)).toBeLessThan(100);
    }
  });
});

describe("legacy plans", () => {
  it("never grants OneNews through the legacy umbrella", () => {
    const umbrella = LEGACY_OFFERS.find((o) => o.key === "legacy-one-read-umbrella");
    expect(umbrella?.grants).toEqual([PRODUCT_ONE_ARTICLE]);
    expect(umbrella?.grants).not.toContain(PRODUCT_ONE_NEWS);
  });

  it("derives the umbrella's included products from that same entry", () => {
    const umbrella = LEGACY_OFFERS.find((o) => o.key === "legacy-one-read-umbrella");
    expect([...ONE_READ_INCLUDED_PRODUCT_KEYS]).toEqual([...(umbrella?.grants ?? [])]);
  });

  it("resolves legacy product ids only through the registry", () => {
    // The retained standalone id must still identify existing subscriptions...
    expect(legacyProductIdFor("legacy-one-article-standalone")).toBeTruthy();
    // ...and must never be one of the ids a current offer would be sold at.
    const currentIds = checkoutEnvVarNames()
      .map((name) => process.env[name]?.trim())
      .filter(Boolean);
    for (const legacyId of allLegacyProductIds()) {
      expect(currentIds).not.toContain(legacyId);
    }
  });

  it("returns null rather than another plan's id for an unknown legacy key", () => {
    expect(legacyProductIdFor("legacy-does-not-exist")).toBeNull();
  });
});

describe("no second source of truth", () => {
  const files = sourceFiles();

  it("scans a non-trivial number of source files", () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it("names Polar checkout environment variables only in the registry", () => {
    const offenders: string[] = [];
    for (const file of files) {
      const rel = relative(REPO_ROOT, file);
      if (REGISTRY_FILES.includes(rel)) continue;
      const contents = readFileSync(file, "utf8");
      for (const name of checkoutEnvVarNames()) {
        if (contents.includes(name)) offenders.push(`${rel} -> ${name}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("hardcodes no Polar product id outside the registry", () => {
    const uuid = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/g;
    const offenders: string[] = [];
    for (const file of files) {
      const rel = relative(REPO_ROOT, file);
      if (REGISTRY_FILES.includes(rel)) continue;
      const matches = readFileSync(file, "utf8").match(uuid);
      if (matches) offenders.push(`${rel} -> ${matches.join(", ")}`);
    }
    expect(offenders).toEqual([]);
  });

  it("prices the mock checkout from the registry", () => {
    expect(PRICING.monthly).toBe(OFFERS["one-article"].prices.monthly.amountUsd);
  });

  it("asks the launch checklist for every registry environment variable", () => {
    const { problems } = validatePublicLaunchConfiguration({});
    for (const name of checkoutEnvVarNames()) {
      expect(problems).toContain(`${name} is not configured.`);
    }
  });

  it("keeps the checkout variable for an offer stable per interval", () => {
    for (const offer of OFFER_KEYS) {
      expect(checkoutEnvVar(offer, "monthly")).not.toBe(checkoutEnvVar(offer, "annual"));
    }
  });
});
