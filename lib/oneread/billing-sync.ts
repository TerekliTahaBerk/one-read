import type { ProductSubscription } from "@prisma/client";
import { getPolarClient, getPolarProductId, mapPolarSubscriptionStatus } from "@/lib/billing/polar";
import { ONE_READ_PRODUCT_KEY } from "@/lib/options";
import { prisma } from "@/lib/prisma";
import { billingIntervalFromProviderInterval } from "@/lib/products/registry";

type PolarSubscriptionSnapshot = {
  id: string;
  status: string;
  productId: string;
  customerId: string;
  checkoutId: string | null;
  recurringInterval: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialStart: Date | null;
  trialEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: Date | null;
  startedAt: Date | null;
  customer?: {
    email?: string | null;
  };
};

const STATUS_PRIORITY: Record<string, number> = {
  active: 5,
  trialing: 4,
  past_due: 3,
  unpaid: 3,
  canceled: 2,
  incomplete: 1,
  incomplete_expired: 0,
};

function newestUsefulSubscription(
  subscriptions: PolarSubscriptionSnapshot[],
): PolarSubscriptionSnapshot | null {
  return (
    subscriptions.sort((left, right) => {
      const statusDifference =
        (STATUS_PRIORITY[right.status] ?? -1) - (STATUS_PRIORITY[left.status] ?? -1);
      if (statusDifference !== 0) return statusDifference;
      return right.currentPeriodEnd.getTime() - left.currentPeriodEnd.getTime();
    })[0] ?? null
  );
}

async function collectPolarSubscriptions(
  request: Parameters<ReturnType<typeof getPolarClient>["subscriptions"]["list"]>[0],
): Promise<PolarSubscriptionSnapshot[]> {
  const pages = await getPolarClient().subscriptions.list({ ...request, limit: 100 });
  const items: PolarSubscriptionSnapshot[] = [];
  for await (const page of pages) {
    items.push(...(page.result.items as PolarSubscriptionSnapshot[]));
  }
  return items;
}

async function findPolarOneReadSubscription(
  contactId: string,
  email: string,
): Promise<PolarSubscriptionSnapshot | null> {
  const productId = getPolarProductId(ONE_READ_PRODUCT_KEY);

  const byExternalId = await collectPolarSubscriptions({
    externalCustomerId: contactId,
    productId,
  });
  const externalMatch = newestUsefulSubscription(byExternalId);
  if (externalMatch) return externalMatch;

  // Older/manual Polar customers may predate externalCustomerId metadata.
  // Exact-email lookup is safe here because callers require a verified-email
  // session before reconciliation.
  const customerPages = await getPolarClient().customers.list({ email, limit: 100 });
  const customerIds: string[] = [];
  for await (const page of customerPages) {
    for (const customer of page.result.items) {
      if (customer.email?.toLowerCase() === email) customerIds.push(customer.id);
    }
  }
  if (customerIds.length === 0) return null;

  const byCustomer = await collectPolarSubscriptions({
    customerId: customerIds,
    productId,
  });
  return newestUsefulSubscription(byCustomer);
}

function planFromPolar(interval: string): string | null {
  return billingIntervalFromProviderInterval(interval);
}

/**
 * Reconciles the local OneRead billing row against Polar.
 *
 * Webhooks remain the primary source of truth. This verified-user fallback
 * closes the gap when a webhook endpoint was temporarily misconfigured or an
 * older Polar customer was created without OneRead metadata. It never creates
 * access from an email alone: the Polar subscription must match the configured
 * OneRead product id.
 */
export async function reconcileOneReadBillingFromPolar(
  email: string,
): Promise<ProductSubscription | null> {
  if (!process.env.POLAR_ACCESS_TOKEN || !process.env.POLAR_ONEREAD_PRODUCT_ID) {
    return null;
  }

  const contact = await prisma.contact.findUnique({
    where: { email },
    select: { id: true },
  });
  if (!contact) return null;

  try {
    const polar = await findPolarOneReadSubscription(contact.id, email);
    if (!polar) return null;

    const current = await prisma.productSubscription.findUnique({
      where: {
        contactId_productKey: {
          contactId: contact.id,
          productKey: ONE_READ_PRODUCT_KEY,
        },
      },
    });
    if (!current) return null;

    const status = mapPolarSubscriptionStatus(polar.status);
    const paidAt =
      status === "ACTIVE_PAID" ? current.paidAt ?? polar.startedAt ?? new Date() : current.paidAt;

    return prisma.productSubscription.update({
      where: { id: current.id },
      data: {
        status,
        paymentProvider: "polar",
        providerCustomerId: polar.customerId,
        providerSubscriptionId: polar.id,
        providerCheckoutSessionId: polar.checkoutId,
        plan: planFromPolar(polar.recurringInterval) ?? current.plan,
        currentPeriodStart: polar.currentPeriodStart,
        currentPeriodEnd: polar.currentPeriodEnd,
        trialStartedAt: polar.trialStart,
        trialEndsAt: polar.trialEnd,
        trialUsedAt: polar.trialStart ?? current.trialUsedAt,
        cancelAtPeriodEnd: polar.cancelAtPeriodEnd,
        canceledAt: polar.canceledAt,
        pastDueAt:
          status === "PAST_DUE" ? current.pastDueAt ?? new Date() : null,
        paidAt,
        billingStateUpdatedAt: new Date(),
      },
    });
  } catch (error) {
    // Lookup/checkout must remain available if Polar has a transient API issue
    // or the token lacks a read scope. Checkout performs a second local guard.
    console.error("[billing-sync] Polar reconciliation failed:", error);
    return null;
  }
}
