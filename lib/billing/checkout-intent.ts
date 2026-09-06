import {
  parseOfferSelection,
  type BillingIntervalKey,
  type OfferKey,
} from "@/lib/products/registry";

/**
 * The purchase intent a verified-email session is bound to.
 *
 * Email verification proves who someone is; it says nothing about what they
 * agreed to buy. Without a binding, a session obtained while looking at one
 * offer could be spent on any other — the price shown and the price charged
 * would come apart silently. So the offer and interval on screen when the code
 * is confirmed are frozen into the signed session cookie as an opaque intent
 * string, and `/api/billing/checkout` refuses any request naming a different
 * one. Changing plan is still allowed, it just costs another verification.
 *
 * The string is a stable serialization of registry values only. It is never
 * parsed back into a provider product id, and nothing derived from it reaches
 * the payment provider.
 */
export function checkoutIntent(offer: OfferKey, interval: BillingIntervalKey): string {
  return `checkout:${offer}:${interval}`;
}

/**
 * Reads an (offer, interval) pair off a request body and renders it as an
 * intent. Fails closed: anything that is not an exact registry pair — an
 * unknown offer, a smuggled provider product id, a partial pair — yields
 * `null` rather than a permissive default.
 */
export function parseCheckoutIntent(offer: unknown, interval: unknown): string | null {
  const selection = parseOfferSelection(offer, interval);
  return selection ? checkoutIntent(selection.offer, selection.interval) : null;
}
