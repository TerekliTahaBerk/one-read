/**
 * Centralized entitlement resolution — the single place that answers
 * "does this contact have access to this product right now, and why?".
 *
 * Every runtime product-access decision must go through this module rather than
 * re-deriving access from subscription rows. Access-window semantics themselves
 * (trial windows, past-due grace, cancel-at-period-end) are NOT reimplemented
 * here: they are delegated to `hasValidAccess` in lib/billing/access.ts, which
 * remains the one authority on lifecycle states.
 *
 * What this module adds on top is the offer→product mapping: which purchases
 * grant which products, including bundles and closed legacy plans.
 *
 * ── Why a bundle row may grant only OneArticle ──────────────────────────────
 * `ProductSubscription` records a `productKey` but not the Polar product that
 * was actually purchased, and the historical $1 umbrella shares the "one-read"
 * key with today's $4 bundle. When the provider product id is unknown we
 * therefore fall back to LEGACY grants (OneArticle only) rather than bundle
 * grants. Under-granting is recoverable — a subscriber contacts support and an
 * operator confirms. Over-granting silently gives away a paid product and
 * misrepresents what a grandfathered subscriber bought. Callers that know the
 * provider product id should pass it, and resolution becomes exact.
 */

import { hasValidAccess, type EligibilityReason } from "@/lib/billing/access";
import {
  OFFERS,
  PRODUCT_KEYS,
  PRODUCT_ONE_ARTICLE,
  isOfferKey,
  type ProductKey,
} from "./registry";
import { resolveOfferFromProviderProductId } from "./polar-config";

/** How a product entitlement was obtained. */
export type EntitlementSource =
  | "standalone"
  | "bundle"
  | "legacy"
  | "admin_override";

/**
 * The subscription shape the resolver needs. Structural rather than the Prisma
 * type so tests, dry-runs and the pipeline can pass hand-built rows, matching
 * the convention in lib/billing/access.ts.
 */
export interface EntitlementSubscriptionInput {
  /** "one-article" | "one-news" | "one-read" */
  productKey: string;
  status: string;
  paymentProvider: string | null;
  adminOverride: boolean;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
  pastDueAt: Date | null;
  /**
   * The Polar product actually purchased, when known. Supplying it is what
   * distinguishes a legacy $1 umbrella from a current $4 bundle.
   */
  providerProductId?: string | null;
}

export interface ProductEntitlement {
  product: ProductKey;
  granted: boolean;
  /** Why access was granted or refused. Mirrors billing/access reasons. */
  reason: EligibilityReason;
  source: EntitlementSource | null;
  /** True when the granting subscription is a closed legacy plan. */
  grandfathered: boolean;
}

export interface EntitlementSnapshot {
  byProduct: Readonly<Record<ProductKey, ProductEntitlement>>;
  hasAnyAccess: boolean;
  /** Legacy plan keys currently granting this contact access, if any. */
  grandfatheredPlans: readonly string[];
}

/**
 * Grants assumed for a subscription row whose provider product is unknown.
 * Deliberately conservative for "one-read" — see the module comment.
 */
function fallbackGrantsForProductKey(productKey: string): readonly ProductKey[] {
  if (productKey === "one-read") return [PRODUCT_ONE_ARTICLE];
  if (isOfferKey(productKey)) return OFFERS[productKey].grants;
  return [];
}

interface ResolvedRow {
  grants: readonly ProductKey[];
  grandfathered: boolean;
  legacyKey: string | null;
  source: EntitlementSource;
}

function resolveRow(sub: EntitlementSubscriptionInput): ResolvedRow {
  const provider = resolveOfferFromProviderProductId(sub.providerProductId);

  if (provider?.legacy) {
    return {
      grants: provider.grants,
      grandfathered: true,
      legacyKey: provider.legacyKey,
      source: "legacy",
    };
  }

  const grants = provider ? provider.grants : fallbackGrantsForProductKey(sub.productKey);
  const isBundle = grants.length > 1;

  // An unidentified "one-read" row is treated as the legacy umbrella, so it is
  // reported as grandfathered rather than as a current bundle purchase.
  const unidentifiedUmbrella = !provider && sub.productKey === "one-read";

  return {
    grants,
    grandfathered: unidentifiedUmbrella,
    legacyKey: unidentifiedUmbrella ? "legacy-one-read-umbrella" : null,
    source: sub.adminOverride
      ? "admin_override"
      : unidentifiedUmbrella
        ? "legacy"
        : isBundle
          ? "bundle"
          : "standalone",
  };
}

const DENIED_DEFAULT: EligibilityReason = "checkout_required";

/**
 * Resolves entitlements for every product from a contact's subscription rows.
 *
 * A product is granted if ANY row that grants it currently has a valid access
 * window. Rows that do not grant the product are ignored entirely, so an
 * expired OneNews subscription can never suppress OneArticle access.
 */
export function resolveEntitlements(
  subscriptions: readonly EntitlementSubscriptionInput[],
  now: Date = new Date(),
): EntitlementSnapshot {
  const byProduct = {} as Record<ProductKey, ProductEntitlement>;
  const grandfatheredPlans = new Set<string>();

  for (const product of PRODUCT_KEYS) {
    let best: ProductEntitlement = {
      product,
      granted: false,
      reason: DENIED_DEFAULT,
      source: null,
      grandfathered: false,
    };
    let sawCandidate = false;

    for (const sub of subscriptions) {
      const resolved = resolveRow(sub);
      if (!resolved.grants.includes(product)) continue;

      const access = hasValidAccess(sub, now);
      if (access.allowed) {
        best = {
          product,
          granted: true,
          reason: access.reason,
          source: resolved.source,
          grandfathered: resolved.grandfathered,
        };
        if (resolved.grandfathered && resolved.legacyKey) {
          grandfatheredPlans.add(resolved.legacyKey);
        }
        break;
      }

      // Keep the first refusal so the caller sees a specific reason
      // ("past_due_grace_ended") instead of a generic "checkout_required".
      if (!sawCandidate) {
        best = {
          product,
          granted: false,
          reason: access.reason,
          source: null,
          grandfathered: false,
        };
        sawCandidate = true;
      }
    }

    byProduct[product] = best;
  }

  return {
    byProduct,
    hasAnyAccess: PRODUCT_KEYS.some((product) => byProduct[product].granted),
    grandfatheredPlans: [...grandfatheredPlans],
  };
}

/** Convenience wrapper for a single product. */
export function resolveProductEntitlement(
  subscriptions: readonly EntitlementSubscriptionInput[],
  product: ProductKey,
  now: Date = new Date(),
): ProductEntitlement {
  return resolveEntitlements(subscriptions, now).byProduct[product];
}

export function hasProductAccess(
  subscriptions: readonly EntitlementSubscriptionInput[],
  product: ProductKey,
  now: Date = new Date(),
): boolean {
  return resolveProductEntitlement(subscriptions, product, now).granted;
}

/**
 * Whether the contact holds a grandfathered plan that a product change would
 * put at risk. Upgrade flows use this to require deliberate confirmation.
 */
export function isGrandfathered(
  subscriptions: readonly EntitlementSubscriptionInput[],
  now: Date = new Date(),
): boolean {
  return resolveEntitlements(subscriptions, now).grandfatheredPlans.length > 0;
}
