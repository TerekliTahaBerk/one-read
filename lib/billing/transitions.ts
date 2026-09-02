/**
 * Subscription transitions — deliberate, user-initiated moves between offers.
 *
 * ── Mechanism ───────────────────────────────────────────────────────────────
 * Every supported transition is an **in-place Polar product change** on the
 * subscriber's existing provider subscription
 * (`subscriptions.update({ productId, prorationBehavior })`).
 *
 * That choice is the whole safety argument:
 *
 *   • No access gap. The same provider subscription stays active throughout;
 *     there is never a moment where the old plan is gone and the new one has
 *     not started.
 *   • No double billing. We never create a second subscription alongside the
 *     first, so a failed or abandoned change cannot leave a customer paying
 *     twice indefinitely.
 *   • No local proration. Money is Polar's job. We pass a proration *behaviour*
 *     and let the provider compute amounts; this module contains no arithmetic
 *     on prices, and must never grow any.
 *   • Provider truth only. Local state is written from the subscription object
 *     Polar returns, never from an assumption about what the change did. When
 *     the provider defers the change to the next period, the row correctly
 *     still reads as the old offer and the pending change lives in
 *     SubscriptionTransition.
 *
 * ── Direction and timing ────────────────────────────────────────────────────
 * Upgrades take effect immediately with an immediate prorated invoice.
 * Downgrades are scheduled for the next billing period: the subscriber keeps
 * the richer plan they already paid for until period end, and no refund or
 * credit logic is needed on our side.
 *
 * ── Grandfathering ──────────────────────────────────────────────────────────
 * Moving off a closed legacy plan destroys its price permanently — an in-place
 * product change cannot be undone back onto a product that is no longer sold.
 * `startTransition` therefore refuses outright unless the caller passes an
 * explicit acknowledgement obtained from the subscriber. Nothing in ordinary
 * webhook processing, preference editing or reconciliation reaches this module.
 */

import { prisma } from "@/lib/prisma";
import { classifySubscription } from "@/lib/products/classification";
import {
  OFFERS,
  offerPrice,
  type BillingIntervalKey,
  type OfferKey,
} from "@/lib/products/registry";
import {
  MissingPolarOfferConfigError,
  resolveCheckoutProductId,
} from "@/lib/products/polar-config";

/** Polar's proration vocabulary. We select one; Polar computes the money. */
export type ProrationBehavior = "invoice" | "next_period";

export const TRANSITION_KINDS = ["upgrade", "downgrade", "interval_change"] as const;
export type TransitionKind = (typeof TRANSITION_KINDS)[number];

export const TRANSITION_STATES = ["PENDING_PROVIDER", "APPLIED", "FAILED"] as const;
export type TransitionState = (typeof TRANSITION_STATES)[number];

/**
 * The exact wording a subscriber must be shown before leaving a legacy plan.
 * Kept here rather than in a page so every surface warns identically.
 */
export const GRANDFATHER_FORFEIT_WARNING =
  "Your current plan is an older price that is no longer offered. If you change plans, " +
  "that price ends and we may not be able to put you back on it later.";

export type TransitionRefusal =
  /** No local subscription to move. */
  | "no_subscription"
  /** No live provider subscription — the subscriber should simply check out. */
  | "checkout_required"
  /** Already on the requested offer and interval. */
  | "already_on_target"
  /** Leaving a legacy price without explicit acknowledgement. */
  | "grandfather_acknowledgement_required"
  /** The destination offer/interval has no configured Polar product. */
  | "target_not_configured"
  /** The provider call failed. Local state is unchanged. */
  | "provider_error";

export interface TransitionPlan {
  kind: TransitionKind;
  fromOfferKey: string;
  fromInterval: BillingIntervalKey | null;
  fromDisplayName: string;
  toOffer: OfferKey;
  toInterval: BillingIntervalKey;
  prorationBehavior: ProrationBehavior;
  /** True when accepting this plan permanently gives up a protected price. */
  forfeitsGrandfathering: boolean;
  /** Shown to the subscriber when `forfeitsGrandfathering`. */
  warning: string | null;
  /** When the subscriber will actually be on the new offer. */
  effective: "immediately" | "next_billing_period";
}

export type TransitionPreview =
  | { ok: true; plan: TransitionPlan }
  | { ok: false; refusal: TransitionRefusal; message: string };

export type TransitionResult =
  | {
      ok: true;
      transitionId: string;
      state: TransitionState;
      plan: TransitionPlan;
      /** Provider-confirmed: has the new product taken effect yet? */
      appliedNow: boolean;
    }
  | { ok: false; refusal: TransitionRefusal; message: string };

/** The subscription fields a transition needs. Structural for testability. */
export interface TransitionSubscription {
  id: string;
  contactId: string;
  productKey: string;
  status: string;
  plan: string | null;
  offerKey: string | null;
  providerProductId: string | null;
  providerSubscriptionId: string | null;
  paymentProvider: string | null;
}

/**
 * Monthly-equivalent price, used only to decide *direction* (upgrade vs
 * downgrade) and therefore proration timing. It is never used to compute a
 * charge, a credit or a refund — that is Polar's job.
 */
function monthlyEquivalentUsd(offer: OfferKey, interval: BillingIntervalKey): number {
  const price = offerPrice(offer, interval);
  return interval === "annual" ? price.amountUsd / 12 : price.amountUsd;
}

function classifyDirection(
  from: { offer: OfferKey; interval: BillingIntervalKey } | null,
  to: { offer: OfferKey; interval: BillingIntervalKey },
): TransitionKind {
  // Leaving an unidentified or legacy plan is always treated as an upgrade:
  // it moves onto current pricing and should take effect immediately, so the
  // subscriber is never left mid-change without the plan they just paid for.
  if (!from) return "upgrade";
  if (from.offer === to.offer) return "interval_change";
  return monthlyEquivalentUsd(to.offer, to.interval) >=
    monthlyEquivalentUsd(from.offer, from.interval)
    ? "upgrade"
    : "downgrade";
}

/**
 * Upgrades bill the difference now so the new entitlement is paid for the
 * moment it is granted. Downgrades wait for the next period, which keeps the
 * subscriber on the plan they already bought and avoids refund logic entirely.
 */
function prorationFor(kind: TransitionKind, isDowngradeInterval: boolean): ProrationBehavior {
  if (kind === "downgrade") return "next_period";
  if (kind === "interval_change" && isDowngradeInterval) return "next_period";
  return "invoice";
}

/**
 * Builds the plan for a requested change without contacting Polar.
 *
 * Safe to call from a UI to render a confirmation screen — it performs no
 * provider mutation and writes nothing.
 */
export function previewTransition(
  sub: TransitionSubscription | null,
  target: { offer: OfferKey; interval: BillingIntervalKey },
  options: { acknowledgeGrandfatherLoss?: boolean } = {},
): TransitionPreview {
  if (!sub) {
    return {
      ok: false,
      refusal: "no_subscription",
      message: "There is no subscription to change.",
    };
  }

  const classification = classifySubscription(sub);

  const from =
    classification.kind === "current" && classification.interval
      ? { offer: classification.offer, interval: classification.interval }
      : null;

  if (
    from &&
    from.offer === target.offer &&
    from.interval === target.interval
  ) {
    return {
      ok: false,
      refusal: "already_on_target",
      message: `You are already on ${OFFERS[target.offer].displayName} ${target.interval} billing.`,
    };
  }

  // Fail closed on configuration before anything else can look like success.
  try {
    resolveCheckoutProductId(target.offer, target.interval);
  } catch (error) {
    if (error instanceof MissingPolarOfferConfigError) {
      return {
        ok: false,
        refusal: "target_not_configured",
        // The subscriber never sees the variable name; the caller logs it.
        message: "That plan is not available right now.",
      };
    }
    throw error;
  }

  const kind = classifyDirection(from, target);
  const isDowngradeInterval =
    kind === "interval_change" && from?.interval === "annual" && target.interval === "monthly";
  const prorationBehavior = prorationFor(kind, isDowngradeInterval);

  const forfeitsGrandfathering = classification.grandfathered;
  if (forfeitsGrandfathering && !options.acknowledgeGrandfatherLoss) {
    return {
      ok: false,
      refusal: "grandfather_acknowledgement_required",
      message: GRANDFATHER_FORFEIT_WARNING,
    };
  }

  return {
    ok: true,
    plan: {
      kind,
      fromOfferKey:
        classification.kind === "current"
          ? classification.offer
          : classification.kind === "legacy"
            ? classification.legacyKey
            : sub.productKey,
      fromInterval: classification.interval,
      fromDisplayName: classification.displayName,
      toOffer: target.offer,
      toInterval: target.interval,
      prorationBehavior,
      forfeitsGrandfathering,
      warning: forfeitsGrandfathering ? GRANDFATHER_FORFEIT_WARNING : null,
      effective: prorationBehavior === "invoice" ? "immediately" : "next_billing_period",
    },
  };
}

/** Injected so tests exercise the real logic without a network call. */
export interface ProviderPlanChange {
  (args: {
    providerSubscriptionId: string;
    providerProductId: string;
    prorationBehavior: ProrationBehavior;
  }): Promise<{
    /** The product the subscription is on *after* the call, per the provider. */
    productId: string | null;
    status: string | null;
    currentPeriodEnd: Date | null;
    cancelAtPeriodEnd: boolean;
  }>;
}

/**
 * Performs a supported transition.
 *
 * Order of operations is deliberate: configuration and grandfathering are
 * checked before any provider call, the provider call happens before any local
 * write, and the local row is written from the provider's response. A failure
 * at any point leaves the subscriber exactly where they were, still paying for
 * and still receiving the plan they already had.
 */
export async function startTransition(args: {
  sub: TransitionSubscription | null;
  target: { offer: OfferKey; interval: BillingIntervalKey };
  acknowledgeGrandfatherLoss?: boolean;
  changePlan: ProviderPlanChange;
}): Promise<TransitionResult> {
  const { sub, target, changePlan } = args;

  const preview = previewTransition(sub, target, {
    acknowledgeGrandfatherLoss: args.acknowledgeGrandfatherLoss,
  });
  if (!preview.ok) return preview;
  // previewTransition returning ok guarantees a subscription.
  const subscription = sub as TransitionSubscription;
  const { plan } = preview;

  // Without a live provider subscription there is nothing to change in place.
  // The subscriber simply buys the offer — no gap risk, because they have no
  // active paid plan to lose.
  if (subscription.paymentProvider !== "polar" || !subscription.providerSubscriptionId) {
    return {
      ok: false,
      refusal: "checkout_required",
      message: "Start a checkout for this plan instead of changing an existing one.",
    };
  }

  const targetProductId = resolveCheckoutProductId(target.offer, target.interval);

  // Recorded before the provider call so a failure still leaves an audit trail
  // of what was attempted, and — critically — of the legacy provider identity
  // that the in-place change is about to overwrite.
  const transition = await prisma.subscriptionTransition.create({
    data: {
      contactId: subscription.contactId,
      subscriptionId: subscription.id,
      kind: plan.kind,
      state: "PENDING_PROVIDER",
      fromOfferKey: subscription.offerKey ?? subscription.productKey,
      fromInterval: subscription.plan,
      fromProviderProductId: subscription.providerProductId,
      fromProviderSubscriptionId: subscription.providerSubscriptionId,
      fromGrandfathered: plan.forfeitsGrandfathering,
      toOfferKey: target.offer,
      toInterval: target.interval,
      toProviderProductId: targetProductId,
      grandfatherAcknowledgedAt: plan.forfeitsGrandfathering ? new Date() : null,
      prorationBehavior: plan.prorationBehavior,
    },
  });

  let providerState: Awaited<ReturnType<ProviderPlanChange>>;
  try {
    providerState = await changePlan({
      providerSubscriptionId: subscription.providerSubscriptionId,
      providerProductId: targetProductId,
      prorationBehavior: plan.prorationBehavior,
    });
  } catch (error) {
    await prisma.subscriptionTransition.update({
      where: { id: transition.id },
      data: {
        state: "FAILED",
        failureReason: error instanceof Error ? error.message : "Provider call failed.",
      },
    });
    return {
      ok: false,
      refusal: "provider_error",
      message: "We could not change your plan. Your current plan is unchanged.",
    };
  }

  // Has the provider actually moved the subscription onto the new product, or
  // scheduled it for the next period? Read, do not assume.
  const appliedNow = providerState.productId === targetProductId;

  await prisma.subscriptionTransition.update({
    where: { id: transition.id },
    data: { state: appliedNow ? "APPLIED" : "PENDING_PROVIDER" },
  });

  if (appliedNow) {
    // Identity only. Lifecycle state stays owned by the webhook, which carries
    // the provider timestamp needed for out-of-order protection.
    await prisma.productSubscription.update({
      where: { id: subscription.id },
      data: {
        offerKey: target.offer,
        providerProductId: targetProductId,
        plan: target.interval,
      },
    });
  }

  return {
    ok: true,
    transitionId: transition.id,
    state: appliedNow ? "APPLIED" : "PENDING_PROVIDER",
    plan,
    appliedNow,
  };
}

/**
 * Closes out pending transitions once the provider confirms the new product.
 *
 * Called from the webhook. A downgrade scheduled for the next billing period
 * lands here weeks later, when Polar finally switches the product and sends a
 * subscription event carrying the target product id.
 */
export async function settleTransitionsForSubscription(args: {
  subscriptionId: string;
  providerProductId: string | null;
  status: string;
}): Promise<number> {
  const { subscriptionId, providerProductId } = args;
  if (!providerProductId) return 0;

  const pending = await prisma.subscriptionTransition.findMany({
    where: { subscriptionId, state: "PENDING_PROVIDER" },
  });
  if (pending.length === 0) return 0;

  const settled = pending.filter(
    (transition) => transition.toProviderProductId === providerProductId,
  );
  if (settled.length === 0) return 0;

  await prisma.subscriptionTransition.updateMany({
    where: { id: { in: settled.map((transition) => transition.id) } },
    data: { state: "APPLIED" },
  });
  return settled.length;
}

/** The pending change to show a subscriber or operator, if any. */
export async function pendingTransitionFor(
  subscriptionId: string,
): Promise<{
  toOfferKey: string;
  toInterval: string;
  kind: string;
  createdAt: Date;
} | null> {
  const pending = await prisma.subscriptionTransition.findFirst({
    where: { subscriptionId, state: "PENDING_PROVIDER" },
    orderBy: { createdAt: "desc" },
    select: { toOfferKey: true, toInterval: true, kind: true, createdAt: true },
  });
  return pending;
}
