/**
 * The billing → entitlement lifecycle contract.
 *
 * This module is the one place that answers, for a single subscription row and
 * a single instant: *what lifecycle state is this, is the subscriber entitled,
 * until when, and which states can it legally move to next?*
 *
 * ── Why it exists ───────────────────────────────────────────────────────────
 * Provider billing state (Polar) and local entitlement are two different
 * vocabularies. The stored `status` column is the provider-facing one; what a
 * pipeline actually needs is "may we deliver to this person right now". Before
 * this module those two were bridged by a switch that mixed both, so states
 * that only differ by a flag — active versus active-but-cancelling, past-due
 * inside grace versus past-due lapsed — were indistinguishable to callers and
 * had to be re-derived, differently, at each call site.
 *
 * `resolveLifecycle` is pure: no Prisma, no clock of its own, no environment
 * reads beyond the configured grace length. Everything downstream
 * (`hasValidAccess`, entitlement resolution, delivery eligibility, admin
 * surfaces) is a projection of its result.
 *
 * ── The two axes stay separate ──────────────────────────────────────────────
 * Paid access and email consent are deliberately different questions.
 * Unsubscribing from emails never removes entitlement — the subscriber keeps
 * what they paid for and can be re-subscribed — and cancelling billing never
 * flips an email preference. `resolveLifecycle` answers only the paid axis;
 * `deliveryEligibility` combines it with consent and preference completeness.
 *
 * ── Fail-safe direction ─────────────────────────────────────────────────────
 * Where the provider has told us something incomplete, this module errs toward
 * *keeping* access that was paid for (a renewal webhook may simply be late) and
 * toward *not* inventing access that was never confirmed. The one exception is
 * an announced end date that has passed: once the provider has said "this ends
 * at T" and T is behind us, access stops without waiting for a second event.
 */

import { PAST_DUE_GRACE_DAYS } from "@/lib/options";

/**
 * The lifecycle states of the contract. Finer-grained than the stored
 * `status` column: a state distinguishes situations that share a status but
 * differ in entitlement (`past_due_grace` vs `past_due_lapsed`) or in what may
 * happen next (`active` vs `cancel_at_period_end`).
 */
export const LIFECYCLE_STATES = [
  "pending_preferences",
  "awaiting_payment",
  "trialing",
  "trial_expired",
  "active",
  "cancel_at_period_end",
  "past_due_grace",
  "past_due_lapsed",
  "canceled_grace",
  "canceled_expired",
  "expired",
  "admin_override",
  "unconfirmed",
  "unknown",
] as const;

export type LifecycleState = (typeof LIFECYCLE_STATES)[number];

/** Why access was granted or refused. The vocabulary callers surface. */
export type EligibilityReason =
  | "ok"
  | "incomplete_preferences"
  | "missing_language_preferences"
  | "missing_article_preferences"
  | "email_unsubscribed"
  | "email_suppressed"
  | "pending_preferences"
  | "checkout_required"
  | "subscription_not_confirmed"
  | "trial_expired"
  | "past_due_grace_ended"
  | "canceled_expired"
  | "access_expired"
  | "unknown_status"
  /** OneRead umbrella access grants this product (see lib/oneread/access.ts). */
  | "included_in_oneread"
  /** A pre-existing standalone OneArticle subscription grants access directly. */
  | "legacy_one_article_access";

/**
 * The subscription fields the contract reads. Structural rather than the
 * Prisma type so tests, dry-runs and the pipeline can pass hand-built rows.
 */
export interface LifecycleInput {
  status: string;
  paymentProvider: string | null;
  adminOverride: boolean;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
  pastDueAt: Date | null;
  /** Provider flag: cancellation requested, access runs to the period end. */
  cancelAtPeriodEnd?: boolean | null;
}

export interface LifecycleResolution {
  state: LifecycleState;
  /** Does the subscriber have paid access to this product right now? */
  entitled: boolean;
  reason: EligibilityReason;
  /**
   * When the current entitlement window ends, if the provider has told us.
   * Null means either "no window" (not entitled) or "open-ended" (a renewing
   * subscription whose next period end we have not been sent yet).
   */
  effectiveUntil: Date | null;
  /** States this one may legally move to. Used to detect impossible writes. */
  allowedTransitions: readonly LifecycleState[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Which states each state may move to.
 *
 * This is a documentation-and-assertion artifact, not a gate: webhooks apply
 * provider truth, and the provider is allowed to surprise us. What the table
 * buys is a way to *notice* — a move that is not listed here is either a
 * provider behaviour we have not modelled or a local bug, and either way it is
 * worth a test failing over.
 */
export const ALLOWED_TRANSITIONS: Readonly<
  Record<LifecycleState, readonly LifecycleState[]>
> = {
  // Setup, before any money is involved.
  pending_preferences: ["awaiting_payment", "admin_override", "expired"],
  awaiting_payment: ["active", "trialing", "admin_override", "expired"],

  trialing: ["active", "trial_expired", "canceled_grace", "canceled_expired", "expired"],
  trial_expired: ["awaiting_payment", "active", "admin_override", "expired"],

  // The paid steady state.
  active: ["active", "cancel_at_period_end", "past_due_grace", "canceled_grace", "expired"],

  // Cancellation announced; still paid for, still entitled.
  cancel_at_period_end: ["active", "canceled_grace", "canceled_expired", "expired"],

  // Payment failed. Grace keeps delivery running while retries happen.
  past_due_grace: ["active", "past_due_lapsed", "canceled_grace", "expired"],
  past_due_lapsed: ["active", "expired", "canceled_expired"],

  // Cancelled, inside the period already paid for.
  canceled_grace: ["active", "canceled_expired", "expired"],
  canceled_expired: ["active", "expired"],

  // Terminal until a new purchase writes a fresh row/state.
  expired: ["awaiting_payment", "active", "trialing", "admin_override"],

  admin_override: ["active", "expired", "awaiting_payment"],

  // Not really lifecycle positions: data we cannot act on.
  unconfirmed: ["active", "trialing", "awaiting_payment", "expired"],
  unknown: [...LIFECYCLE_STATES],
};

/**
 * A provider must have confirmed the money before a paid-looking status counts.
 * An admin comp bypasses this by design; the mock provider is dev/test only, so
 * a stray "mock" row in production grants nothing.
 */
function providerConfirmsAccess(
  sub: Pick<LifecycleInput, "paymentProvider" | "adminOverride">,
): boolean {
  if (sub.adminOverride) return true;
  if (sub.paymentProvider === "polar") return true;
  return sub.paymentProvider === "mock" && process.env.NODE_ENV !== "production";
}

function resolution(
  state: LifecycleState,
  entitled: boolean,
  reason: EligibilityReason,
  effectiveUntil: Date | null = null,
): LifecycleResolution {
  return {
    state,
    entitled,
    reason,
    effectiveUntil,
    allowedTransitions: ALLOWED_TRANSITIONS[state],
  };
}

/**
 * Resolves the lifecycle position of one subscription row at one instant.
 *
 * The stored status selects the branch; the dated fields decide entitlement
 * inside it. Nothing here reads the database or the wall clock — pass `now`.
 */
export function resolveLifecycle(
  sub: LifecycleInput,
  now: Date = new Date(),
): LifecycleResolution {
  const cancelAtPeriodEnd = Boolean(sub.cancelAtPeriodEnd);

  switch (sub.status) {
    case "ADMIN_OVERRIDE":
      return resolution("admin_override", true, "ok");

    case "ACTIVE_PAID": {
      if (!providerConfirmsAccess(sub)) {
        return resolution("unconfirmed", false, "subscription_not_confirmed");
      }
      if (!cancelAtPeriodEnd) {
        // A period end in the past is not evidence of anything here: a renewal
        // webhook can be late, and dropping a renewing subscriber because of
        // our own delivery lag is the worse failure. Keep access.
        return resolution("active", true, "ok", sub.currentPeriodEnd);
      }
      // Cancellation is announced, so the end date is a commitment rather than
      // a stale renewal marker: honour it even if `subscription.revoked` has
      // not arrived yet.
      if (sub.currentPeriodEnd && now >= sub.currentPeriodEnd) {
        return resolution("canceled_expired", false, "canceled_expired");
      }
      return resolution("cancel_at_period_end", true, "ok", sub.currentPeriodEnd);
    }

    case "TRIALING": {
      if (!providerConfirmsAccess(sub)) {
        return resolution("unconfirmed", false, "subscription_not_confirmed");
      }
      return sub.trialEndsAt && now < sub.trialEndsAt
        ? resolution("trialing", true, "ok", sub.trialEndsAt)
        : resolution("trial_expired", false, "trial_expired");
    }

    case "CANCELED": {
      if (!providerConfirmsAccess(sub)) {
        return resolution("unconfirmed", false, "subscription_not_confirmed");
      }
      // Cancelled but still inside the paid period keeps access until it ends.
      return sub.currentPeriodEnd && now < sub.currentPeriodEnd
        ? resolution("canceled_grace", true, "ok", sub.currentPeriodEnd)
        : resolution("canceled_expired", false, "canceled_expired");
    }

    case "PAST_DUE": {
      if (!providerConfirmsAccess(sub)) {
        return resolution("unconfirmed", false, "subscription_not_confirmed");
      }
      // Grace runs from when payment first failed. `currentPeriodEnd` is the
      // fallback anchor for rows whose past-due moment was never stamped
      // (historical rows, or a provider event that reported the status without
      // announcing the transition) — without it those rows would lose access
      // the instant they went past due, which is the opposite of a grace
      // window.
      const graceAnchor = sub.pastDueAt ?? sub.currentPeriodEnd;
      if (!graceAnchor) {
        return resolution("past_due_lapsed", false, "past_due_grace_ended");
      }
      const graceEnd = new Date(graceAnchor.getTime() + PAST_DUE_GRACE_DAYS * DAY_MS);
      return now < graceEnd
        ? resolution("past_due_grace", true, "ok", graceEnd)
        : resolution("past_due_lapsed", false, "past_due_grace_ended");
    }

    case "PENDING_PREFERENCES":
      return resolution("pending_preferences", false, "pending_preferences");
    case "PENDING_CHECKOUT":
      return resolution("awaiting_payment", false, "checkout_required");
    case "TRIAL_EXPIRED":
      return resolution("trial_expired", false, "trial_expired");
    case "EXPIRED":
      return resolution("expired", false, "access_expired");
    default:
      return resolution("unknown", false, "unknown_status");
  }
}

/** Whether `to` is a move the contract models from `from`. */
export function isAllowedTransition(from: LifecycleState, to: LifecycleState): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}
