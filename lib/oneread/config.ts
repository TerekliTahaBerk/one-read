/**
 * Legacy OneRead umbrella configuration.
 *
 * The umbrella ($1, `productKey = "one-read"`) is closed to new customers; the
 * current commercial catalogue lives in lib/products/registry.ts and its Polar
 * mapping in lib/products/polar-config.ts. Nothing here describes anything for
 * sale, so nothing here defines a price — a second price definition beside the
 * registry is exactly the drift these modules were consolidated to remove.
 *
 * What survives is the one fact this module owns: which products a live
 * umbrella subscription grants — and even that is read from the registry's
 * legacy entry rather than restated, so the delivery pipeline and the
 * entitlement resolver can never disagree about it.
 */

import { LEGACY_OFFERS } from "@/lib/products/polar-config";
import { legacyProductIdFor } from "@/lib/products/polar-config";

const UMBRELLA_KEY = "legacy-one-read-umbrella";

/** Product keys included in every OneRead umbrella subscription. */
export const ONE_READ_INCLUDED_PRODUCT_KEYS: readonly string[] =
  LEGACY_OFFERS.find((offer) => offer.key === UMBRELLA_KEY)?.grants ?? [];

/**
 * The umbrella's Polar product id, or null when unconfigured, so callers can
 * render a "billing not configured" state instead of crashing. Inbound-only:
 * it identifies existing subscriptions and must never open a new checkout.
 */
export function oneReadPolarProductId(): string | null {
  return legacyProductIdFor(UMBRELLA_KEY);
}

export function oneReadBillingConfigured(): boolean {
  return oneReadPolarProductId() !== null;
}
