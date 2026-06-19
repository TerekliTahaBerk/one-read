import { ONE_NEWS_PRODUCT_KEY } from "@/lib/options";
import { findOneNewsSubscription, newsPreferencesComplete } from "@/lib/news/subscriptions";
import { newsBillingConfigured } from "@/lib/news/config";
import {
  createPolarCheckoutForSubscription,
  createPolarCustomerPortalUrl,
  isPolarConfigured,
} from "@/lib/billing/polar";
import type { CheckoutResult } from "@/lib/billing/types";

/**
 * OneNews checkout/portal helpers. OneNews uses Polar exclusively (source of
 * truth for trial/paid access). Mirrors the OneLingo checkout module; shares
 * the underlying Polar client helpers.
 */

export type NewsCheckoutResult =
  | CheckoutResult
  | { kind: "billing_not_configured" };

export async function createOneNewsCheckoutSession(
  email: string,
): Promise<NewsCheckoutResult> {
  const sub = await findOneNewsSubscription(email);
  if (!sub) return { kind: "needs_setup_first" };
  if (!newsPreferencesComplete(sub.newsPreferences)) return { kind: "needs_setup" };

  if (
    sub.status === "ACTIVE_PAID" ||
    sub.status === "ADMIN_OVERRIDE" ||
    (sub.status === "TRIALING" &&
      sub.paymentProvider === "polar" &&
      sub.trialEndsAt &&
      new Date() < sub.trialEndsAt)
  ) {
    return { kind: "already_active", manageUrl: "/api/news/subscribe/portal" };
  }

  if (!newsBillingConfigured() || !isPolarConfigured()) {
    return { kind: "billing_not_configured" };
  }

  const url = await createPolarCheckoutForSubscription(
    { id: sub.id, contactId: sub.contactId },
    email,
    ONE_NEWS_PRODUCT_KEY,
  );
  return { kind: "redirect", url };
}

export async function createOneNewsPortalSession(
  email: string,
): Promise<{ url: string }> {
  const sub = await findOneNewsSubscription(email);
  if (!sub) throw new Error("No subscription found.");
  if (!sub.providerCustomerId && sub.paymentProvider !== "polar") {
    throw new Error("Polar customer is not available yet.");
  }
  return {
    url: await createPolarCustomerPortalUrl(
      { providerCustomerId: sub.providerCustomerId, contactId: sub.contactId },
      ONE_NEWS_PRODUCT_KEY,
    ),
  };
}
