/**
 * OneRead umbrella product configuration — single source of truth for pricing
 * and included products. The umbrella subscription (`productKey = "one-read"`)
 * unlocks both OneArticle and OneFilm through one Polar checkout.
 */

import { ONE_ARTICLE_PRODUCT_KEY, ONE_FILM_PRODUCT_KEY, ONE_READ_PRODUCT_KEY } from "@/lib/options";

/** Product keys included in every OneRead umbrella subscription. */
export const ONE_READ_INCLUDED_PRODUCT_KEYS = [
  ONE_ARTICLE_PRODUCT_KEY,
  ONE_FILM_PRODUCT_KEY,
] as const;

/** Config-driven pricing — never hardcode this elsewhere. */
export const ONEREAD_PRICE_MONTHLY = Number(process.env.ONEREAD_PRICE_MONTHLY ?? 1);
export const ONEREAD_BILLING_LABEL =
  process.env.ONEREAD_BILLING_LABEL?.trim() || "$1 / month";

export const ONEREAD_TRUST_NOTES = [
  ONEREAD_BILLING_LABEL,
  "OneArticle included",
  "OneFilm included",
  "No app",
  "Cancel anytime",
  "Billing handled securely by Polar",
] as const;

/**
 * The OneRead Polar product id. Never falls back to another product's id.
 * Returns null when unconfigured so callers render a safe "billing not
 * configured" state instead of crashing.
 */
export function oneReadPolarProductId(): string | null {
  const id = process.env.POLAR_ONEREAD_PRODUCT_ID?.trim();
  return id ? id : null;
}

export function oneReadBillingConfigured(): boolean {
  return oneReadPolarProductId() !== null;
}
