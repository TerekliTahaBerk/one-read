import { ONE_FILM_PRODUCT_KEY } from "@/lib/options";
import { findOneFilmSubscription, filmPreferencesComplete } from "@/lib/film/subscriptions";
import { filmBillingConfigured } from "@/lib/film/config";
import {
  createPolarCheckoutForSubscription,
  createPolarCustomerPortalUrl,
  isPolarConfigured,
} from "@/lib/billing/polar";
import type { CheckoutResult } from "@/lib/billing/types";

export type FilmCheckoutResult =
  | CheckoutResult
  | { kind: "billing_not_configured" };

export async function createOneFilmCheckoutSession(
  email: string,
): Promise<FilmCheckoutResult> {
  const sub = await findOneFilmSubscription(email);
  if (!sub) return { kind: "needs_setup_first" };
  if (!filmPreferencesComplete(sub.filmPreferences)) return { kind: "needs_setup" };

  if (
    sub.status === "ACTIVE_PAID" ||
    sub.status === "ADMIN_OVERRIDE" ||
    (sub.status === "TRIALING" &&
      sub.paymentProvider === "polar" &&
      sub.trialEndsAt &&
      new Date() < sub.trialEndsAt)
  ) {
    return { kind: "already_active", manageUrl: "/api/film/subscribe/portal" };
  }

  if (!filmBillingConfigured() || !isPolarConfigured()) {
    return { kind: "billing_not_configured" };
  }

  const url = await createPolarCheckoutForSubscription(
    { id: sub.id, contactId: sub.contactId },
    email,
    ONE_FILM_PRODUCT_KEY,
  );
  return { kind: "redirect", url };
}

export async function createOneFilmPortalSession(
  email: string,
): Promise<{ url: string }> {
  const sub = await findOneFilmSubscription(email);
  if (!sub) throw new Error("No subscription found.");
  if (!sub.providerCustomerId && sub.paymentProvider !== "polar") {
    throw new Error("Polar customer is not available yet.");
  }
  return {
    url: await createPolarCustomerPortalUrl(
      { providerCustomerId: sub.providerCustomerId, contactId: sub.contactId },
      ONE_FILM_PRODUCT_KEY,
    ),
  };
}
