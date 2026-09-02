/**
 * OneRead product & offer registry — the single source of truth for what we
 * sell and what each purchase grants.
 *
 * Two deliberately separate concepts:
 *
 *   Product — an editorial thing a subscriber receives.
 *             OneArticle, OneNews.
 *   Offer   — a thing a subscriber can buy.
 *             OneArticle, OneNews, or the OneRead bundle (which grants both).
 *
 * Offer keys are intentionally identical to the `ProductSubscription.productKey`
 * values already present in production ("one-article", "one-news", "one-read"),
 * so introducing offers needs no data migration and no new table. The existing
 * `@@unique([contactId, productKey])` constraint therefore means: one
 * subscription row per offer per contact, and a bundle row can coexist with a
 * standalone row during an upgrade.
 *
 * This is a code-level registry on purpose. There is no admin CRUD for
 * products and no database-driven catalog.
 */

/* ------------------------------- products ------------------------------- */

export const PRODUCT_ONE_ARTICLE = "one-article" as const;
export const PRODUCT_ONE_NEWS = "one-news" as const;

export const PRODUCT_KEYS = [PRODUCT_ONE_ARTICLE, PRODUCT_ONE_NEWS] as const;
export type ProductKey = (typeof PRODUCT_KEYS)[number];

export interface ProductDefinition {
  key: ProductKey;
  displayName: string;
  /** One-line public positioning. Kept here so copy cannot drift per surface. */
  tagline: string;
}

export const PRODUCTS: Readonly<Record<ProductKey, ProductDefinition>> = {
  [PRODUCT_ONE_ARTICLE]: {
    key: PRODUCT_ONE_ARTICLE,
    displayName: "OneArticle",
    tagline: "One carefully edited article worth your time.",
  },
  [PRODUCT_ONE_NEWS]: {
    key: PRODUCT_ONE_NEWS,
    displayName: "OneNews",
    tagline: "One story worth understanding.",
  },
};

export function isProductKey(value: unknown): value is ProductKey {
  return typeof value === "string" && (PRODUCT_KEYS as readonly string[]).includes(value);
}

/* -------------------------------- offers -------------------------------- */

export const OFFER_ONE_ARTICLE = "one-article" as const;
export const OFFER_ONE_NEWS = "one-news" as const;
export const OFFER_ONE_READ_BUNDLE = "one-read" as const;

export const OFFER_KEYS = [
  OFFER_ONE_ARTICLE,
  OFFER_ONE_NEWS,
  OFFER_ONE_READ_BUNDLE,
] as const;
export type OfferKey = (typeof OFFER_KEYS)[number];

export const BILLING_INTERVAL_KEYS = ["monthly", "annual"] as const;
export type BillingIntervalKey = (typeof BILLING_INTERVAL_KEYS)[number];

export interface OfferPrice {
  /** Amount charged per billing period, in whole USD. */
  amountUsd: number;
  /** Polar's own interval vocabulary, used when reading provider payloads. */
  providerInterval: "month" | "year";
}

export interface OfferDefinition {
  key: OfferKey;
  displayName: string;
  tagline: string;
  /** Products this offer grants access to. The bundle grants both. */
  grants: readonly ProductKey[];
  prices: Readonly<Record<BillingIntervalKey, OfferPrice>>;
}

export const OFFERS: Readonly<Record<OfferKey, OfferDefinition>> = {
  [OFFER_ONE_ARTICLE]: {
    key: OFFER_ONE_ARTICLE,
    displayName: "OneArticle",
    tagline: PRODUCTS[PRODUCT_ONE_ARTICLE].tagline,
    grants: [PRODUCT_ONE_ARTICLE],
    prices: {
      monthly: { amountUsd: 2, providerInterval: "month" },
      annual: { amountUsd: 18, providerInterval: "year" },
    },
  },
  [OFFER_ONE_NEWS]: {
    key: OFFER_ONE_NEWS,
    displayName: "OneNews",
    tagline: PRODUCTS[PRODUCT_ONE_NEWS].tagline,
    grants: [PRODUCT_ONE_NEWS],
    prices: {
      monthly: { amountUsd: 3, providerInterval: "month" },
      annual: { amountUsd: 27, providerInterval: "year" },
    },
  },
  [OFFER_ONE_READ_BUNDLE]: {
    key: OFFER_ONE_READ_BUNDLE,
    displayName: "OneRead",
    tagline: "Both, in one subscription.",
    grants: [PRODUCT_ONE_ARTICLE, PRODUCT_ONE_NEWS],
    prices: {
      monthly: { amountUsd: 4, providerInterval: "month" },
      annual: { amountUsd: 36, providerInterval: "year" },
    },
  },
};

export function isOfferKey(value: unknown): value is OfferKey {
  return typeof value === "string" && (OFFER_KEYS as readonly string[]).includes(value);
}

export function isBillingIntervalKey(value: unknown): value is BillingIntervalKey {
  return (
    typeof value === "string" &&
    (BILLING_INTERVAL_KEYS as readonly string[]).includes(value)
  );
}

/**
 * Parses an untrusted (offer, interval) pair from a request body or query
 * string. Returns null rather than throwing so routes can answer 400 without a
 * try/catch, and so an arbitrary provider product id from the browser can never
 * reach Polar.
 */
export function parseOfferSelection(
  offer: unknown,
  interval: unknown,
): { offer: OfferKey; interval: BillingIntervalKey } | null {
  if (!isOfferKey(offer) || !isBillingIntervalKey(interval)) return null;
  return { offer, interval };
}

/** Products granted by an offer. Unknown offers grant nothing. */
export function productsGrantedByOffer(offer: string): readonly ProductKey[] {
  return isOfferKey(offer) ? OFFERS[offer].grants : [];
}

/** Whether an offer grants a specific product. */
export function offerGrantsProduct(offer: string, product: ProductKey): boolean {
  return productsGrantedByOffer(offer).includes(product);
}

/** Offers that grant a given product, bundle included. */
export function offersGrantingProduct(product: ProductKey): readonly OfferKey[] {
  return OFFER_KEYS.filter((key) => OFFERS[key].grants.includes(product));
}

export function offerPrice(offer: OfferKey, interval: BillingIntervalKey): OfferPrice {
  return OFFERS[offer].prices[interval];
}

/**
 * Annual saving versus paying monthly for twelve months, in whole USD.
 * Used by the pricing page so the discount is never hand-written into copy.
 */
export function annualSavingUsd(offer: OfferKey): number {
  const { monthly, annual } = OFFERS[offer].prices;
  return monthly.amountUsd * 12 - annual.amountUsd;
}

/** Maps Polar's recurring-interval vocabulary onto our interval keys. */
export function billingIntervalFromProviderInterval(
  interval: string | null | undefined,
): BillingIntervalKey | null {
  switch ((interval ?? "").toLowerCase()) {
    case "month":
    case "monthly":
      return "monthly";
    case "year":
    case "yearly":
    case "annual":
      return "annual";
    default:
      return null;
  }
}
