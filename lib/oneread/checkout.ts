import {
  ONE_READ_PRODUCT_KEY,
  ONE_ARTICLE_PRODUCT_KEY,
} from "@/lib/options";
import { prisma } from "@/lib/prisma";
import {
  createPolarCheckoutForSubscription,
  createPolarCustomerPortalUrl,
} from "@/lib/billing/polar";
import { preferencesComplete } from "@/lib/subscriptions";
import { ensureOneReadSubscription } from "@/lib/oneread/access";

export type OneReadCheckoutResult =
  | { kind: "needs_setup_first" }
  | { kind: "needs_setup" }
  | { kind: "already_active"; manageUrl: string }
  | { kind: "redirect"; url: string };

/**
 * Starts (or resumes) a OneRead checkout. Requires the OneArticle reading
 * language before Polar checkout is allowed.
 */
export async function createOneReadCheckoutSession(
  email: string,
): Promise<OneReadCheckoutResult> {
  const sub = await ensureOneReadSubscription(email);

  const articleHolder = await prisma.productSubscription.findUnique({
    where: { contactId_productKey: { contactId: sub.contactId, productKey: ONE_ARTICLE_PRODUCT_KEY } },
    include: { preferences: true },
  });
  if (!preferencesComplete(articleHolder?.preferences ?? null)) {
    return { kind: "needs_setup" };
  }

  if (
    sub.status === "ACTIVE_PAID" ||
    sub.status === "ADMIN_OVERRIDE" ||
    (sub.status === "TRIALING" &&
      sub.paymentProvider === "polar" &&
      sub.trialEndsAt &&
      new Date() < sub.trialEndsAt)
  ) {
    return { kind: "already_active", manageUrl: "/api/oneread/portal" };
  }

  const url = await createPolarCheckoutForSubscription(sub, email, ONE_READ_PRODUCT_KEY);
  return { kind: "redirect", url };
}

export async function createOneReadPortalUrl(email: string): Promise<string> {
  const sub = await ensureOneReadSubscription(email);
  if (!sub.providerCustomerId && sub.paymentProvider !== "polar") {
    throw new Error("Polar customer is not available yet.");
  }
  return createPolarCustomerPortalUrl(sub, ONE_READ_PRODUCT_KEY);
}
