import { track } from "@vercel/analytics";

/**
 * The complete OneRead product-analytics taxonomy.
 *
 * Vercel Analytics is the only product analytics tool. First-party database
 * rows (ProductSubscription, OneArticleDelivery, BillingEvent) remain
 * authoritative for anything billing- or delivery-related; these events exist
 * only to show where people drop out of the public funnel.
 */
export type AnalyticsEvent =
  | "public_sample_viewed"
  | "subscribe_cta_clicked"
  | "verification_requested"
  | "email_verified"
  | "preferences_completed"
  | "checkout_started"
  | "email_unsubscribed"
  | "email_resubscribed";

/**
 * The only properties allowed to leave the browser.
 *
 * Deliberately excluded, and enforced by `sanitizeProperties` below: email
 * addresses, OTP codes, verification and unsubscribe tokens, Polar customer or
 * subscription IDs, IP addresses, webhook payloads, and editorial content.
 */
export interface AnalyticsProperties {
  /** Product key, e.g. "one-article". */
  product?: string;
  /** Billing interval when known, e.g. "monthly". */
  interval?: string;
  /** Reading language, e.g. "English". */
  readingLanguage?: string;
  /** Explicit, intentionally supported campaign identifier. */
  campaign?: string;
}

const ALLOWED_KEYS: readonly (keyof AnalyticsProperties)[] = [
  "product",
  "interval",
  "readingLanguage",
  "campaign",
];

/** Anything resembling an address, token, or long opaque ID is dropped. */
const DISALLOWED_VALUE = /@|^[A-Za-z0-9_-]{20,}$/;

/**
 * Allow-lists properties by key and rejects values that look like identifiers.
 * Two independent gates, so adding a field to the interface is not by itself
 * enough to leak a token.
 */
export function sanitizeProperties(
  properties: AnalyticsProperties = {},
): Record<string, string> {
  const safe: Record<string, string> = {};
  for (const key of ALLOWED_KEYS) {
    const value = properties[key];
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (!trimmed || trimmed.length > 64) continue;
    if (DISALLOWED_VALUE.test(trimmed)) continue;
    safe[key] = trimmed;
  }
  return safe;
}

/** Records a product event. Never throws: analytics must not break a flow. */
export function trackEvent(
  event: AnalyticsEvent,
  properties?: AnalyticsProperties,
): void {
  try {
    track(event, sanitizeProperties(properties));
  } catch {
    // Analytics is best-effort and must never interrupt signup or billing.
  }
}
