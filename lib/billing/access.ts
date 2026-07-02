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
 * The minimal shape `canReceiveOneArticleEmail` needs. Kept structural (rather
 * than importing the Prisma type) so the pipeline can pass a hand-built object
 * in tests and dry-runs, and so this module has no Prisma dependency.
 */
export interface EligibilityInput {
  status: string;
  emailDeliveryStatus: string;
  paymentProvider: string | null;
  adminOverride: boolean;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
  pastDueAt: Date | null;
  /** Whether One-Article preferences are complete enough to render an email. */
  hasCompletePreferences: boolean;
}

export type EligibilityReason =
  | "ok"
  | "incomplete_preferences"
  | "missing_language_preferences"
  | "missing_news_preferences"
  | "missing_film_preferences"
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
  | "legacy_one_article_access"
  /** A pre-existing standalone OneFilm subscription grants access directly. */
  | "legacy_one_film_access";

export interface EligibilityResult {
  allowed: boolean;
  reason: EligibilityReason;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function providerConfirmsAccess(
  sub: Pick<EligibilityInput, "paymentProvider" | "adminOverride">,
): boolean {
  if (sub.adminOverride) return true;
  if (sub.paymentProvider === "polar") return true;
  return sub.paymentProvider === "mock" && process.env.NODE_ENV !== "production";
}

/**
 * Returns whether the access status alone grants a valid window right now,
 * ignoring email-delivery and preference checks. Split out so admin/UI can ask
 * "does this person have access?" independently of "will they get an email?".
 */
export function hasValidAccess(
  sub: Pick<
    EligibilityInput,
    | "status"
    | "paymentProvider"
    | "adminOverride"
    | "trialEndsAt"
    | "currentPeriodEnd"
    | "pastDueAt"
  >,
  now: Date = new Date(),
): EligibilityResult {
  switch (sub.status as AccessStatus) {
    case "ADMIN_OVERRIDE":
      return { allowed: true, reason: "ok" };
    case "ACTIVE_PAID":
      if (!providerConfirmsAccess(sub)) {
        return { allowed: false, reason: "subscription_not_confirmed" };
      }
      return { allowed: true, reason: "ok" };
    case "TRIALING":
      if (!providerConfirmsAccess(sub)) {
        return { allowed: false, reason: "subscription_not_confirmed" };
      }
      return sub.trialEndsAt && now < sub.trialEndsAt
        ? { allowed: true, reason: "ok" }
        : { allowed: false, reason: "trial_expired" };
    case "CANCELED":
      if (!providerConfirmsAccess(sub)) {
        return { allowed: false, reason: "subscription_not_confirmed" };
      }
      // Canceled but still inside the paid period keeps access until it ends.
      return sub.currentPeriodEnd && now < sub.currentPeriodEnd
        ? { allowed: true, reason: "ok" }
        : { allowed: false, reason: "canceled_expired" };
    case "PAST_DUE": {
      if (!providerConfirmsAccess(sub)) {
        return { allowed: false, reason: "subscription_not_confirmed" };
      }
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
    case "PENDING_CHECKOUT":
      return { allowed: false, reason: "checkout_required" };
    case "TRIAL_EXPIRED":
      return { allowed: false, reason: "trial_expired" };
    case "EXPIRED":
      return { allowed: false, reason: "access_expired" };
    default:
      return { allowed: false, reason: "unknown_status" };
  }
}

/**
 * The single source of truth for "should this subscriber receive a daily email
 * for this product right now?". Product-agnostic — OneArticle and OneLingo both
 * route through here. All daily-send logic must use this — never re-implement
 * these checks inline.
 *
 * A subscriber is eligible only if ALL hold:
 *   1. preferences are complete,
 *   2. email delivery is enabled (SUBSCRIBED), and
 *   3. their access status grants a valid window (see hasValidAccess).
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
