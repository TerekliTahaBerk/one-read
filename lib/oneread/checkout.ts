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
import { reconcileOneReadBillingFromPolar } from "@/lib/oneread/billing-sync";
import { hasValidAccess } from "@/lib/billing/access";

export type OneReadCheckoutResult =
  | { kind: "needs_setup_first" }
  | { kind: "needs_setup" }
  | { kind: "already_active"; billingManageable: boolean }
  | { kind: "redirect"; url: string };

/**
 * Starts (or resumes) the OneRead checkout after OneArticle preferences are complete.
 */
export async function createOneReadCheckoutSession(
  email: string,
): Promise<OneReadCheckoutResult> {
  const ensured = await ensureOneReadSubscription(email);
  await reconcileOneReadBillingFromPolar(email);
  const sub =
    (await prisma.productSubscription.findUnique({
      where: { id: ensured.id },
    })) ?? ensured;

  const articleHolder = await prisma.productSubscription.findUnique({
    where: { contactId_productKey: { contactId: sub.contactId, productKey: ONE_ARTICLE_PRODUCT_KEY } },
    include: { preferences: true },
  });
  if (!preferencesComplete(articleHolder?.preferences ?? null)) {
    return { kind: "needs_setup" };
  }

  if (hasValidAccess(sub).allowed) {
    return {
      kind: "already_active",
      billingManageable: sub.paymentProvider === "polar",
    };
  }

  const url = await createPolarCheckoutForSubscription(sub, email, ONE_READ_PRODUCT_KEY);
  return { kind: "redirect", url };
}

export async function createOneReadPortalUrl(email: string): Promise<string> {
  const ensured = await ensureOneReadSubscription(email);
  await reconcileOneReadBillingFromPolar(email);
  const sub =
    (await prisma.productSubscription.findUnique({
      where: { id: ensured.id },
    })) ?? ensured;
  if (!sub.providerCustomerId && sub.paymentProvider !== "polar") {
    throw new Error("Polar customer is not available yet.");
  }
  return createPolarCustomerPortalUrl(sub, ONE_READ_PRODUCT_KEY);
}
