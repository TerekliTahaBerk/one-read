/**
 * Historical + current subscription classification.
 *
 * This module answers one question, and only this module is allowed to answer
 * it: **what commercial offer created this subscription row?**
 *
 * ── Why this exists ─────────────────────────────────────────────────────────
 * `ProductSubscription.productKey` records a slot, not a purchase. The
 * historical $1 umbrella and the future $4 OneRead bundle both live under
 * `productKey = "one-read"`, so that column alone cannot distinguish a
 * grandfathered subscriber from a bundle subscriber. Reading it as "bundle"
 * would silently hand every legacy $1 subscriber OneNews for free.
 *
 * Milestone C2 adds two persisted fields that remove the ambiguity for all new
 * billing activity — `providerProductId` (what Polar charged for) and
 * `offerKey` (which offer we resolved that to). Historical rows have neither,
 * and are never backfilled by guesswork.
 *
 * ── Evidence ordering ───────────────────────────────────────────────────────
 * Sources are consulted strongest-first and the first hit wins:
 *
 *   1. `providerProductId` — provider truth. Resolved through the Polar
 *      registry, which knows both current and closed legacy products.
 *   2. `offerKey`          — our own recorded conclusion from when the
 *      subscription was written. Trusted, but weaker than re-deriving from the
 *      provider, because configuration may since have been corrected.
 *   3. `productKey`        — inference of last resort, and the only source that
 *      can produce an `unknown` classification.
 *
 * A caller must never downgrade a row from a strong source to a weaker one:
 * `improveClassification` enforces that when a webhook later reveals the
 * provider product for a previously unidentified subscription.
 */

import {
  OFFERS,
  PRODUCT_ONE_ARTICLE,
  isBillingIntervalKey,
  isOfferKey,
  type BillingIntervalKey,
  type OfferKey,
  type ProductKey,
} from "./registry";
import {
  LEGACY_OFFERS,
  resolveOfferFromProviderProductId,
  type LegacyOfferDefinition,
} from "./polar-config";

/** Which evidence produced a classification. Ordered weakest to strongest. */
export const CLASSIFICATION_EVIDENCE = ["product_key", "offer_key", "provider_product"] as const;
export type ClassificationEvidence = (typeof CLASSIFICATION_EVIDENCE)[number];

function evidenceRank(evidence: ClassificationEvidence): number {
  return CLASSIFICATION_EVIDENCE.indexOf(evidence);
}

export type SubscriptionClassification =
  /** A current, on-sale offer. The subscriber is on today's pricing. */
  | {
      kind: "current";
      offer: OfferKey;
      interval: BillingIntervalKey | null;
      displayName: string;
      grants: readonly ProductKey[];
      grandfathered: false;
      evidence: ClassificationEvidence;
    }
  /** A closed historical plan we can name exactly. */
  | {
      kind: "legacy";
      legacyKey: string;
      interval: BillingIntervalKey | null;
      displayName: string;
      grants: readonly ProductKey[];
      grandfathered: true;
      evidence: ClassificationEvidence;
    }
  /**
   * A historical row we cannot name. Grants are the conservative floor implied
   * by `productKey`, never the bundle.
   */
  | {
      kind: "unknown";
      interval: BillingIntervalKey | null;
      displayName: string;
      grants: readonly ProductKey[];
      grandfathered: boolean;
      evidence: ClassificationEvidence;
    };

/** The fields classification reads. Structural, so tests can hand-build rows. */
export interface ClassifiableSubscription {
  productKey: string;
  offerKey?: string | null;
  providerProductId?: string | null;
  /** Stored billing interval ("monthly" | "annual"), historically `plan`. */
  plan?: string | null;
}

function legacyByKey(key: string): LegacyOfferDefinition | undefined {
  return LEGACY_OFFERS.find((entry) => entry.key === key);
}

function intervalOf(sub: ClassifiableSubscription): BillingIntervalKey | null {
  return isBillingIntervalKey(sub.plan) ? sub.plan : null;
}

/**
 * Conservative grants for a row whose offer we cannot identify.
 *
 * "one-read" is the dangerous case: it is shared by the legacy $1 umbrella and
 * the current bundle, so an unidentified row gets OneArticle only. Under-
 * granting is recoverable through support; over-granting silently gives away a
 * paid product. "one-article" and "one-news" are unambiguous — both the legacy
 * and current versions of those plans grant the same single product.
 */
function fallbackGrants(productKey: string): readonly ProductKey[] {
  if (productKey === "one-read") return [PRODUCT_ONE_ARTICLE];
  if (isOfferKey(productKey)) return OFFERS[productKey].grants;
  return [];
}

/**
 * Classifies a subscription row from the strongest evidence available.
 * Pure — it performs no I/O and never mutates the row.
 */
export function classifySubscription(
  sub: ClassifiableSubscription,
): SubscriptionClassification {
  const interval = intervalOf(sub);

  // 1. Provider truth.
  const provider = resolveOfferFromProviderProductId(sub.providerProductId);
  if (provider) {
    if (provider.legacy) {
      const legacy = legacyByKey(provider.legacyKey);
      return {
        kind: "legacy",
        legacyKey: provider.legacyKey,
        interval,
        displayName: legacy?.displayName ?? provider.legacyKey,
        grants: provider.grants,
        grandfathered: true,
        evidence: "provider_product",
      };
    }
    return {
      kind: "current",
      offer: provider.offer,
      // The provider product pins the interval exactly; prefer it over `plan`.
      interval: provider.interval,
      displayName: OFFERS[provider.offer].displayName,
      grants: provider.grants,
      grandfathered: false,
      evidence: "provider_product",
    };
  }

  // 2. Our own recorded conclusion.
  const offerKey = sub.offerKey?.trim();
  if (offerKey) {
    if (isOfferKey(offerKey)) {
      return {
        kind: "current",
        offer: offerKey,
        interval,
        displayName: OFFERS[offerKey].displayName,
        grants: OFFERS[offerKey].grants,
        grandfathered: false,
        evidence: "offer_key",
      };
    }
    const legacy = legacyByKey(offerKey);
    if (legacy) {
      return {
        kind: "legacy",
        legacyKey: legacy.key,
        interval,
        displayName: legacy.displayName,
        grants: legacy.grants,
        grandfathered: true,
        evidence: "offer_key",
      };
    }
    // A persisted key we no longer recognise. Fall through to inference rather
    // than trusting a name we cannot resolve to any grant list.
  }

  // 3. Inference of last resort.
  const umbrella = sub.productKey === "one-read";
  return {
    kind: "unknown",
    interval,
    displayName: umbrella ? "OneRead (unidentified historical plan)" : "Unidentified plan",
    grants: fallbackGrants(sub.productKey),
    // An unidentified "one-read" row predates offer identity, so it is a
    // historical purchase by definition and is reported as grandfathered.
    grandfathered: umbrella,
    evidence: "product_key",
  };
}

/** True when the classification names a closed plan whose price is protected. */
export function isGrandfatheredClassification(
  classification: SubscriptionClassification,
): boolean {
  return classification.grandfathered;
}

/**
 * The `offerKey` that should be persisted for a classification, or null when
 * the row cannot be named. Never returns a guess: an `unknown` classification
 * persists nothing, so the row stays explicitly unclassified.
 */
export function persistableOfferKey(
  classification: SubscriptionClassification,
): string | null {
  if (classification.kind === "current") return classification.offer;
  if (classification.kind === "legacy") return classification.legacyKey;
  return null;
}

export interface ClassificationImprovement {
  /** Fields to write, empty when the new evidence is not an improvement. */
  data: { offerKey?: string; providerProductId?: string };
  improved: boolean;
  reason: "improved" | "not_stronger" | "unidentifiable";
}

/**
 * Decides whether newly-observed provider evidence should be persisted onto an
 * existing row.
 *
 * Only ever moves a row *up* the evidence ladder. A webhook that reveals the
 * Polar product for a previously unidentified legacy subscription is an
 * improvement and is written. Anything that would replace provider truth with a
 * weaker inference is refused, so a later event carrying no product id cannot
 * erase a classification an earlier event established.
 */
export function improveClassification(
  existing: ClassifiableSubscription,
  observedProviderProductId: string | null | undefined,
): ClassificationImprovement {
  const observed = observedProviderProductId?.trim();
  if (!observed) return { data: {}, improved: false, reason: "not_stronger" };

  const resolved = resolveOfferFromProviderProductId(observed);
  if (!resolved) {
    // Recognisable as *a* product id, but not one of ours. Recording it would
    // attach an unresolvable identity to a live subscription.
    return { data: {}, improved: false, reason: "unidentifiable" };
  }

  const current = classifySubscription(existing);
  const incomingRank = evidenceRank("provider_product");
  if (
    evidenceRank(current.evidence) > incomingRank ||
    (existing.providerProductId?.trim() === observed && current.evidence === "provider_product")
  ) {
    return { data: {}, improved: false, reason: "not_stronger" };
  }

  const offerKey = resolved.legacy ? resolved.legacyKey : resolved.offer;
  return {
    data: { offerKey, providerProductId: observed },
    improved: true,
    reason: "improved",
  };
}
