/**
 * Deterministic Polar product-id fixtures.
 *
 * Real provider ids are environment configuration and are deliberately absent
 * from the repository. These stand-ins let the full six-offer matrix be
 * exercised against the real resolution code without credentials, a network
 * call, or any dependency on which ids happen to be configured locally.
 */

import { BILLING_INTERVAL_KEYS, OFFER_KEYS } from "@/lib/products/registry";
import { checkoutEnvVar } from "@/lib/products/polar-config";

/** Test product id for an (offer, interval) pair. */
export function testProductId(offer: string, interval: string): string {
  return `prod_test_${offer}_${interval}`;
}

/** The legacy $1 umbrella product. Inbound-only; never checkout-able. */
export const LEGACY_ONEREAD_PRODUCT_ID = "prod_test_legacy_oneread_umbrella";
/** The original standalone OneArticle product, hard-coded in lib/products. */
export const LEGACY_ONE_ARTICLE_PRODUCT_ID = "44ef8bae-87eb-40eb-9a07-8b4a97e1434e";

const MANAGED_VARS = [
  ...OFFER_KEYS.flatMap((offer) =>
    BILLING_INTERVAL_KEYS.map((interval) => checkoutEnvVar(offer, interval)),
  ),
  "POLAR_ONEREAD_PRODUCT_ID",
  "POLAR_ONE_ARTICLE_PRODUCT_ID",
];

/** Clears every offer variable so a test starts from a known-empty config. */
export function clearOfferEnv(): void {
  for (const name of MANAGED_VARS) delete process.env[name];
}

/**
 * Configures all six current offers plus the legacy umbrella.
 * `except` omits specific variables, for fail-closed tests.
 */
export function configureAllOffers(options: { except?: string[] } = {}): void {
  clearOfferEnv();
  const except = new Set(options.except ?? []);
  for (const offer of OFFER_KEYS) {
    for (const interval of BILLING_INTERVAL_KEYS) {
      const name = checkoutEnvVar(offer, interval);
      if (except.has(name)) continue;
      process.env[name] = testProductId(offer, interval);
    }
  }
  if (!except.has("POLAR_ONEREAD_PRODUCT_ID")) {
    process.env.POLAR_ONEREAD_PRODUCT_ID = LEGACY_ONEREAD_PRODUCT_ID;
  }
}
