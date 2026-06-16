import { PAST_DUE_GRACE_DAYS } from "@/lib/options";

/**
 * Access lifecycle states for a ProductSubscription. These describe whether a
 * subscriber currently has *access* to the product — a separate axis from
 * email-delivery status (see EmailDeliveryStatus). Unsubscribing from emails
 * must never change access, and canceling billing must never silently stop
 * email mid-period.
 */
export type AccessStatus =
  | "PENDING_PREFERENCES"
  | "TRIALING"
  | "TRIAL_EXPIRED"
  | "ACTIVE_PAID"
  | "PAST_DUE"
  | "CANCELED"
  | "EXPIRED"
  | "ADMIN_OVERRIDE";

export type EmailDeliveryStatus = "SUBSCRIBED" | "UNSUBSCRIBED" | "SUPPRESSED";

/**
 * The minimal shape `canReceiveOneArticleEmail` needs. Kept structural (rather
 * than importing the Prisma type) so the pipeline can pass a hand-built object
 * in tests and dry-runs, and so this module has no Prisma dependency.
 */
export interface EligibilityInput {
  status: string;
  emailDeliveryStatus: string;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
  pastDueAt: Date | null;
  /** Whether One-Article preferences are complete enough to render an email. */
  hasCompletePreferences: boolean;
}

export type EligibilityReason =
  | "ok"
  | "incomplete_preferences"
  | "email_unsubscribed"
  | "email_suppressed"
  | "pending_preferences"
  | "trial_expired"
  | "past_due_grace_ended"
  | "canceled_expired"
  | "access_expired"
  | "unknown_status";

export interface EligibilityResult {
  allowed: boolean;
  reason: EligibilityReason;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Returns whether the access status alone grants a valid window right now,
 * ignoring email-delivery and preference checks. Split out so admin/UI can ask
 * "does this person have access?" independently of "will they get an email?".
 */
export function hasValidAccess(
  sub: Pick<
    EligibilityInput,
    "status" | "trialEndsAt" | "currentPeriodEnd" | "pastDueAt"
  >,
  now: Date = new Date(),
): EligibilityResult {
  switch (sub.status as AccessStatus) {
    case "ADMIN_OVERRIDE":
      return { allowed: true, reason: "ok" };
    case "ACTIVE_PAID":
      return { allowed: true, reason: "ok" };
    case "TRIALING":
      return sub.trialEndsAt && now < sub.trialEndsAt
        ? { allowed: true, reason: "ok" }
        : { allowed: false, reason: "trial_expired" };
    case "CANCELED":
      // Canceled but still inside the paid period keeps access until it ends.
      return sub.currentPeriodEnd && now < sub.currentPeriodEnd
        ? { allowed: true, reason: "ok" }
        : { allowed: false, reason: "canceled_expired" };
    case "PAST_DUE": {
      // Grace window measured from when the payment first failed.
      const graceEnd = sub.pastDueAt
        ? new Date(sub.pastDueAt.getTime() + PAST_DUE_GRACE_DAYS * DAY_MS)
        : null;
      return graceEnd && now < graceEnd
        ? { allowed: true, reason: "ok" }
        : { allowed: false, reason: "past_due_grace_ended" };
    }
    case "PENDING_PREFERENCES":
      return { allowed: false, reason: "pending_preferences" };
    case "TRIAL_EXPIRED":
      return { allowed: false, reason: "trial_expired" };
    case "EXPIRED":
      return { allowed: false, reason: "access_expired" };
    default:
      return { allowed: false, reason: "unknown_status" };
  }
}

/**
 * The single source of truth for "should this subscriber receive a daily One
 * Article email right now?". All daily-send logic must route through here —
 * never re-implement these checks inline.
 *
 * A subscriber is eligible only if ALL hold:
 *   1. preferences are complete,
 *   2. email delivery is enabled (SUBSCRIBED), and
 *   3. their access status grants a valid window (see hasValidAccess).
 */
export function canReceiveOneArticleEmail(
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
