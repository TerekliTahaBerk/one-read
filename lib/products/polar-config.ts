/**
 * Polar product/price configuration for every OneRead offer.
 *
 * Two directions, with deliberately different strictness:
 *
 *   Outbound (new checkout) — `resolveCheckoutProductId` is fail-closed. A
 *     missing identifier throws naming the exact environment variable. It never
 *     falls back to another offer's id and never resolves a legacy product, so
 *     a new customer cannot be placed on legacy pricing.
 *
 *   Inbound (webhooks / reconciliation) — `resolveOfferFromProviderProductId`
 *     is permissive about *recognising* products, legacy ones included, because
 *     refusing to recognise an existing subscription would strand a paying
 *     customer. It never invents access: an unknown product id returns null and
 *     the caller ignores the event.
 *
 * GRANDFATHERING LIVES HERE. Legacy Polar products are described as their own
 * entries carrying their own `grants`, never as aliases of a current offer. The
 * historical $1 OneRead umbrella granted OneArticle only; mapping it onto
 * today's $4 bundle would silently hand legacy subscribers OneNews. It is
 * modelled separately so that cannot happen.
 */

import {
  OFFERS,
  OFFER_KEYS,
  OFFER_ONE_ARTICLE,
  OFFER_ONE_NEWS,
  OFFER_ONE_READ_BUNDLE,
  PRODUCT_ONE_ARTICLE,
  BILLING_INTERVAL_KEYS,
  type BillingIntervalKey,
  type OfferKey,
  type ProductKey,
} from "./registry";

/* ---------------------------- env var mapping ---------------------------- */

/** Environment variable holding the Polar product id for each (offer, interval). */
const CHECKOUT_ENV_VARS: Readonly<
  Record<OfferKey, Record<BillingIntervalKey, string>>
> = {
  [OFFER_ONE_ARTICLE]: {
    monthly: "POLAR_ONE_ARTICLE_MONTHLY_PRODUCT_ID",
    annual: "POLAR_ONE_ARTICLE_ANNUAL_PRODUCT_ID",
  },
  [OFFER_ONE_NEWS]: {
    monthly: "POLAR_ONE_NEWS_MONTHLY_PRODUCT_ID",
    annual: "POLAR_ONE_NEWS_ANNUAL_PRODUCT_ID",
  },
  [OFFER_ONE_READ_BUNDLE]: {
    monthly: "POLAR_ONE_READ_MONTHLY_PRODUCT_ID",
    annual: "POLAR_ONE_READ_ANNUAL_PRODUCT_ID",
  },
};

export function checkoutEnvVar(
  offer: OfferKey,
  interval: BillingIntervalKey,
): string {
  return CHECKOUT_ENV_VARS[offer][interval];
}

function readEnv(name: string): string | null {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value.trim() : null;
}

/* ------------------------------- legacy ---------------------------------- */

/**
 * A Polar product that existing subscribers are already billed against, and
 * which is closed to new purchases.
 */
export interface LegacyOfferDefinition {
  /** Stable identifier for logging and admin display. Not an OfferKey. */
  key: string;
  displayName: string;
  /** The `ProductSubscription.productKey` these subscriptions are stored under. */
  subscriptionProductKey: string;
  /** Products this historical purchase grants — deliberately its own list. */
  grants: readonly ProductKey[];
  /** Environment variable naming the product id, when one is configured. */
  envVar: string | null;
  /**
   * Product ids recognised even with no environment variable set. Retained only
   * so a pre-existing subscription keeps resolving if its variable is ever
   * dropped; never used to price or create a checkout.
   */
  fallbackProductIds: readonly string[];
}

export const LEGACY_OFFERS: readonly LegacyOfferDefinition[] = [
  {
    key: "legacy-one-read-umbrella",
    displayName: "OneRead (legacy $1 umbrella)",
    subscriptionProductKey: OFFER_ONE_READ_BUNDLE,
    // The historical umbrella bundled OneArticle only. It must NOT grant OneNews.
    grants: [PRODUCT_ONE_ARTICLE],
    envVar: "POLAR_ONEREAD_PRODUCT_ID",
    fallbackProductIds: [],
  },
  {
    key: "legacy-one-article-standalone",
    displayName: "OneArticle (legacy standalone)",
    subscriptionProductKey: OFFER_ONE_ARTICLE,
    grants: [PRODUCT_ONE_ARTICLE],
    envVar: "POLAR_ONE_ARTICLE_PRODUCT_ID",
    // The original hard-coded OneArticle product, quarantined here so it can
    // still identify live legacy subscriptions but can never be checked out.
    fallbackProductIds: ["44ef8bae-87eb-40eb-9a07-8b4a97e1434e"],
  },
];

function legacyProductIds(legacy: LegacyOfferDefinition): string[] {
  const fromEnv = legacy.envVar ? readEnv(legacy.envVar) : null;
  return [...(fromEnv ? [fromEnv] : []), ...legacy.fallbackProductIds];
}

/* --------------------------- outbound checkout --------------------------- */

export class MissingPolarOfferConfigError extends Error {
  readonly offer: OfferKey;
  readonly interval: BillingIntervalKey;
  readonly envVar: string;

  constructor(offer: OfferKey, interval: BillingIntervalKey, envVar: string) {
    super(
      `${OFFERS[offer].displayName} ${interval} billing is not configured. Missing: ${envVar}.`,
    );
    this.name = "MissingPolarOfferConfigError";
    this.offer = offer;
    this.interval = interval;
    this.envVar = envVar;
  }
}

/**
 * Polar product id to check out for a new purchase. Throws rather than falling
 * back, so an unconfigured offer fails loudly instead of billing the customer
 * for the wrong thing.
 */
export function resolveCheckoutProductId(
  offer: OfferKey,
  interval: BillingIntervalKey,
): string {
  const envVar = checkoutEnvVar(offer, interval);
  const id = readEnv(envVar);
  if (!id) throw new MissingPolarOfferConfigError(offer, interval, envVar);
  return id;
}

export function isOfferConfigured(
  offer: OfferKey,
  interval: BillingIntervalKey,
): boolean {
  return readEnv(checkoutEnvVar(offer, interval)) !== null;
}

/** Environment variables required for the full commercial matrix but unset. */
export function missingOfferConfig(): string[] {
  const missing: string[] = [];
  for (const offer of OFFER_KEYS) {
    for (const interval of BILLING_INTERVAL_KEYS) {
      if (!isOfferConfigured(offer, interval)) missing.push(checkoutEnvVar(offer, interval));
    }
  }
  return missing;
}

/* ------------------------ inbound provider lookup ------------------------ */

export type ResolvedProviderOffer =
  | {
      legacy: false;
      offer: OfferKey;
      interval: BillingIntervalKey;
      subscriptionProductKey: string;
      grants: readonly ProductKey[];
    }
  | {
      legacy: true;
      legacyKey: string;
      subscriptionProductKey: string;
      grants: readonly ProductKey[];
    };

/**
 * Identifies which offer a Polar product id belongs to. Current offers are
 * matched first, then legacy products. Returns null for anything unrecognised
 * so callers can ignore the event rather than guess.
 */
export function resolveOfferFromProviderProductId(
  productId: string | null | undefined,
): ResolvedProviderOffer | null {
  const id = productId?.trim();
  if (!id) return null;

  for (const offer of OFFER_KEYS) {
    for (const interval of BILLING_INTERVAL_KEYS) {
      if (readEnv(checkoutEnvVar(offer, interval)) === id) {
        return {
          legacy: false,
          offer,
          interval,
          subscriptionProductKey: offer,
          grants: OFFERS[offer].grants,
        };
      }
    }
  }

  for (const legacy of LEGACY_OFFERS) {
    if (legacyProductIds(legacy).includes(id)) {
      return {
        legacy: true,
        legacyKey: legacy.key,
        subscriptionProductKey: legacy.subscriptionProductKey,
        grants: legacy.grants,
      };
    }
  }

  return null;
}

/** Whether a Polar product id belongs to a closed legacy plan. */
export function isLegacyProviderProductId(productId: string | null | undefined): boolean {
  return resolveOfferFromProviderProductId(productId)?.legacy === true;
}

/**
 * All Polar product ids currently recognised, for admin/system-health display.
 * Values are provider ids, not secrets, and are never sent to the browser by
 * this module — callers decide what to surface.
 */
export function describeOfferConfig(): {
  current: { offer: OfferKey; interval: BillingIntervalKey; envVar: string; configured: boolean }[];
  legacy: { key: string; displayName: string; configuredIds: number }[];
  missing: string[];
} {
  const current = OFFER_KEYS.flatMap((offer) =>
    BILLING_INTERVAL_KEYS.map((interval) => ({
      offer,
      interval,
      envVar: checkoutEnvVar(offer, interval),
      configured: isOfferConfigured(offer, interval),
    })),
  );
  return {
    current,
    legacy: LEGACY_OFFERS.map((entry) => ({
      key: entry.key,
      displayName: entry.displayName,
      configuredIds: legacyProductIds(entry).length,
    })),
    missing: missingOfferConfig(),
  };
}

/* --------------------------- environment safety --------------------------- */

export type PolarEnvironment = "sandbox" | "production";

/**
 * The Polar API environment. Production requires the exact string
 * `POLAR_SERVER=production`; anything else — including unset, empty or
 * misspelled — resolves to sandbox.
 *
 * Failing towards sandbox is the safe direction: a production deployment that
 * forgets the variable cannot charge anyone, whereas the reverse would let a
 * preview deployment take real money.
 */
export function polarEnvironment(): PolarEnvironment {
  return process.env.POLAR_SERVER === "production" ? "production" : "sandbox";
}

export interface PolarConfigProblem {
  severity: "error" | "warning";
  message: string;
}

/**
 * Configuration validation for a startup or admin health check.
 *
 * It deliberately does NOT try to detect whether a given product id belongs to
 * the sandbox or production Polar organisation — that is not derivable from the
 * id, and guessing would be worse than saying nothing. What it can prove is
 * that the environment is internally consistent and that nothing is missing
 * before a checkout is attempted.
 */
export function validatePolarConfiguration(): PolarConfigProblem[] {
  const problems: PolarConfigProblem[] = [];
  const environment = polarEnvironment();
  const missing = missingOfferConfig();

  if (missing.length > 0) {
    problems.push({
      severity: environment === "production" ? "error" : "warning",
      message: `Offer configuration missing: ${missing.join(", ")}. Those offers cannot be purchased.`,
    });
  }

  // A production deployment reusing a legacy id as a current offer id would
  // quietly sell the closed plan at its old price under a new name.
  const legacyIds = new Set(LEGACY_OFFERS.flatMap(legacyProductIds));
  for (const offer of OFFER_KEYS) {
    for (const interval of BILLING_INTERVAL_KEYS) {
      const id = readEnv(checkoutEnvVar(offer, interval));
      if (id && legacyIds.has(id)) {
        problems.push({
          severity: "error",
          message: `${checkoutEnvVar(offer, interval)} is set to a legacy product id. Legacy products are inbound-only and must never be sold as a current offer.`,
        });
      }
    }
  }

  // The same id configured for two different offers would bill one product and
  // grant another.
  const seen = new Map<string, string>();
  for (const offer of OFFER_KEYS) {
    for (const interval of BILLING_INTERVAL_KEYS) {
      const envVar = checkoutEnvVar(offer, interval);
      const id = readEnv(envVar);
      if (!id) continue;
      const previous = seen.get(id);
      if (previous) {
        problems.push({
          severity: "error",
          message: `${envVar} and ${previous} share the same Polar product id. Each offer/interval needs its own product.`,
        });
      } else {
        seen.set(id, envVar);
      }
    }
  }

  return problems;
}

/** True when every current offer can be sold safely in this environment. */
export function isPolarConfigurationSafe(): boolean {
  return validatePolarConfiguration().every((problem) => problem.severity !== "error");
}
