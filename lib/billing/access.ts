/**
 * Access and delivery eligibility — the thin, caller-facing projection of the
 * billing lifecycle contract in lib/billing/lifecycle.ts.
 *
 * This module deliberately contains no lifecycle reasoning of its own. Trial
 * windows, past-due grace, cancel-at-period-end and provider confirmation all
 * live in `resolveLifecycle`, so there is exactly one place where "is this
 * subscriber entitled right now?" is decided. What stays here is the *second*
 * axis: email consent and preference completeness, which gate delivery without
 * ever touching entitlement.
 *
 * Access status and email-delivery status must stay independent. Unsubscribing
 * from emails never removes paid access, and cancelling billing never silently
 * flips an email preference mid-period.
 */

import {
  resolveLifecycle,
  type EligibilityReason,
  type LifecycleInput,
  type LifecycleResolution,
} from "@/lib/billing/lifecycle";

export type { EligibilityReason };
export type { LifecycleState, LifecycleResolution } from "@/lib/billing/lifecycle";

/**
 * Access lifecycle states as stored in `ProductSubscription.status`. These
 * describe whether a subscriber currently has *access* to the product — a
 * separate axis from email-delivery status (see EmailDeliveryStatus).
 */
export type AccessStatus =
  | "PENDING_PREFERENCES"
  | "PENDING_CHECKOUT"
  | "TRIALING"
  | "TRIAL_EXPIRED"
  | "ACTIVE_PAID"
  | "PAST_DUE"
  | "CANCELED"
  | "EXPIRED"
  | "ADMIN_OVERRIDE";

export type EmailDeliveryStatus = "SUBSCRIBED" | "UNSUBSCRIBED" | "SUPPRESSED";

/**
 * The minimal shape `canReceiveProductEmail` needs. Kept structural (rather
 * than importing the Prisma type) so the pipeline can pass a hand-built object
 * in tests and dry-runs, and so this module has no Prisma dependency.
 */
export interface EligibilityInput extends LifecycleInput {
  emailDeliveryStatus: string;
  /** Whether One-Article preferences are complete enough to render an email. */
  hasCompletePreferences: boolean;
}

export interface EligibilityResult {
  allowed: boolean;
  reason: EligibilityReason;
}

/**
 * Returns whether the access status alone grants a valid window right now,
 * ignoring email-delivery and preference checks. Split out so admin/UI can ask
 * "does this person have access?" independently of "will they get an email?".
 */
export function hasValidAccess(
  sub: LifecycleInput,
  now: Date = new Date(),
): EligibilityResult {
  const lifecycle = resolveLifecycle(sub, now);
  return { allowed: lifecycle.entitled, reason: lifecycle.reason };
}

/**
 * The full lifecycle position, for callers that need more than a yes/no —
 * admin surfaces showing "cancelling on the 14th", or anything that must
 * distinguish past-due-in-grace from past-due-lapsed.
 */
export function accessLifecycle(
  sub: LifecycleInput,
  now: Date = new Date(),
): LifecycleResolution {
  return resolveLifecycle(sub, now);
}

/**
 * The single source of truth for "should this subscriber receive a daily email
 * for this product right now?". All send logic must use this — never
 * re-implement these checks inline.
 *
 * A subscriber is eligible only if ALL hold:
 *   1. preferences are complete,
 *   2. email delivery is enabled (SUBSCRIBED), and
 *   3. their lifecycle state grants entitlement (see resolveLifecycle).
 *
 * Consent is checked before entitlement on purpose: someone who has asked not
 * to be emailed should be reported as unsubscribed, not as a billing problem.
 */
export function canReceiveProductEmail(
  sub: EligibilityInput,
  now: Date = new Date(),
): EligibilityResult {
  if (!sub.hasCompletePreferences) {
    return { allowed: false, reason: "incomplete_preferences" };
  }
  if (sub.emailDeliveryStatus === "SUPPRESSED") {
    return { allowed: false, reason: "email_suppressed" };
  }
  if (sub.emailDeliveryStatus !== "SUBSCRIBED") {
    return { allowed: false, reason: "email_unsubscribed" };
  }
  return hasValidAccess(sub, now);
}

/**
 * OneArticle-named alias, preserved so existing callers and semantics are
 * identical after the product-agnostic rename.
 */
export const canReceiveOneArticleEmail = canReceiveProductEmail;
