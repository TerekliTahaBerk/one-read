import { ONE_LINGO_PRODUCT_KEY } from "@/lib/options";
import {
  findOneLingoSubscription,
  lingoPreferencesComplete,
} from "@/lib/lingo/subscriptions";
import { lingoBillingConfigured } from "@/lib/lingo/config";
import {
  createPolarCheckoutForSubscription,
  createPolarCustomerPortalUrl,
  isPolarConfigured,
} from "@/lib/billing/polar";
import type { CheckoutResult } from "@/lib/billing/types";

/**
 * OneLingo checkout/portal helpers. OneLingo uses Polar exclusively (the source
 * of truth for trial/paid access). Kept separate from the OneArticle
 * BillingProvider so the OneArticle interface stays untouched, while sharing
 * the underlying Polar client helpers.
 */

export type LingoCheckoutResult =
  | CheckoutResult
  /** OneLingo Polar product id is missing — render a safe message, don't crash. */
  | { kind: "billing_not_configured" };

export async function createOneLingoCheckoutSession(
  email: string,
): Promise<LingoCheckoutResult> {
  const sub = await findOneLingoSubscription(email);
  if (!sub) return { kind: "needs_setup_first" };
  if (!lingoPreferencesComplete(sub.lingoPreferences)) return { kind: "needs_setup" };

  if (
    sub.status === "ACTIVE_PAID" ||
    sub.status === "ADMIN_OVERRIDE" ||
    (sub.status === "TRIALING" &&
      sub.paymentProvider === "polar" &&
      sub.trialEndsAt &&
      new Date() < sub.trialEndsAt)
  ) {
    return { kind: "already_active", manageUrl: "/api/lingo/subscribe/portal" };
  }

  if (!lingoBillingConfigured() || !isPolarConfigured()) {
    return { kind: "billing_not_configured" };
  }

  const url = await createPolarCheckoutForSubscription(
    { id: sub.id, contactId: sub.contactId },
    email,
    ONE_LINGO_PRODUCT_KEY,
  );
  return { kind: "redirect", url };
}

export async function createOneLingoPortalSession(
  email: string,
): Promise<{ url: string }> {
  const sub = await findOneLingoSubscription(email);
  if (!sub) throw new Error("No subscription found.");
  if (!sub.providerCustomerId && sub.paymentProvider !== "polar") {
    throw new Error("Polar customer is not available yet.");
  }
  return {
    url: await createPolarCustomerPortalUrl(
      { providerCustomerId: sub.providerCustomerId, contactId: sub.contactId },
      ONE_LINGO_PRODUCT_KEY,
    ),
  };
}
