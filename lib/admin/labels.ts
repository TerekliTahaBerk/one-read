/**
 * Central humanization layer: maps raw status/enum codes used across the admin
 * (access status, email delivery, recipient delivery and editorial state)
 * to plain-English labels. One place so every screen speaks the same language
 * and no raw enum ever reaches the owner's eyes.
 */

const LABELS: Record<string, string> = {
  // Access status (ProductSubscription.status)
  ACTIVE_PAID: "Paying",
  TRIALING: "On trial",
  ADMIN_OVERRIDE: "Manual access",
  PENDING_CHECKOUT: "Awaiting payment",
  PENDING_PREFERENCES: "Setting up",
  PAST_DUE: "Payment overdue",
  TRIAL_EXPIRED: "Trial ended",
  EXPIRED: "Expired",
  CANCELED: "Canceled",

  // Email delivery (emailDeliveryStatus)
  SUBSCRIBED: "Receiving emails",
  UNSUBSCRIBED: "Unsubscribed",
  SUPPRESSED: "Blocked (bounced)",

  // Recipient delivery status
  SENT: "Delivered",
  QUEUED: "Waiting",
  FAILED: "Failed",
  SKIPPED: "Skipped",

  // Editorial status
  DRAFT: "Draft",
  READY: "Ready",
  PENDING: "Needs review",
  NEEDS_REVIEW: "Needs review",
  APPROVED: "Approved",
  SCHEDULED: "Scheduled",
  REJECTED: "Rejected",
  SCORED: "Scored",
  NO_FILM: "No film chosen",

  // Product / visibility helpers
  live: "Live",
  waitlist: "Waitlist",
  public: "Public",
  hidden: "Hidden",
  eligible: "Eligible",
  blocked: "Blocked",
};

/** Title-case a raw SCREAMING_SNAKE or kebab value as a last resort. */
function titleCase(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Friendly label for a raw status/enum value. Falls back to Title Case. */
export function labelFor(value: string): string {
  return LABELS[value] ?? titleCase(value);
}
