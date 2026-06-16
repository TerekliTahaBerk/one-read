import { Polar } from "@polar-sh/sdk";
import type { BillingInterval } from "@/lib/options";
import { ONE_ARTICLE_PRODUCT_KEY } from "@/lib/options";
import { prisma } from "@/lib/prisma";
import {
  findOneArticleSubscription,
  preferencesComplete,
  type SubscriptionWithPrefs,
} from "@/lib/subscriptions";
import type {
  BillingProvider,
  CheckoutResult,
  CreateCheckoutArgs,
  ProviderSubscriptionStatus,
  RedirectResult,
} from "./types";

const PROVIDER = "polar" as const;
const DEFAULT_ONE_ARTICLE_PRODUCT_ID =
  "44ef8bae-87eb-40eb-9a07-8b4a97e1434e";

type PolarServer = "sandbox" | "production";

function has(value: string | undefined): value is string {
  return Boolean(value && value.trim().length > 0);
}

export function getPolarServer(): PolarServer {
  return process.env.POLAR_SERVER === "production" ? "production" : "sandbox";
}

export function getPolarProductId(): string {
  return (
    process.env.POLAR_ONE_ARTICLE_PRODUCT_ID?.trim() ||
    DEFAULT_ONE_ARTICLE_PRODUCT_ID
  );
}

function getMissingPolarConfig(): string[] {
  const missing: string[] = [];
  if (!has(process.env.POLAR_ACCESS_TOKEN)) missing.push("POLAR_ACCESS_TOKEN");
  if (!has(process.env.POLAR_SUCCESS_URL) && !has(process.env.PUBLIC_BASE_URL)) {
    missing.push("POLAR_SUCCESS_URL or PUBLIC_BASE_URL");
  }
  return missing;
}

export function isPolarConfigured(): boolean {
  return getMissingPolarConfig().length === 0;
}

function assertPolarConfigured(context: string): void {
  const missing = getMissingPolarConfig();
  if (missing.length > 0) {
    throw new Error(`${context} is not configured. Missing: ${missing.join(", ")}.`);
  }
}

export function getPolarClient(): Polar {
  const accessToken = process.env.POLAR_ACCESS_TOKEN;
  if (!has(accessToken)) {
    throw new Error("Polar access token is not configured.");
  }
  return new Polar({ accessToken, server: getPolarServer() });
}

function checkoutReturnUrl(): string | undefined {
  const base = process.env.PUBLIC_BASE_URL?.replace(/\/$/, "");
  return base ? `${base}/article/subscribe` : undefined;
}

function checkoutSuccessUrl(): string {
  const configured = process.env.POLAR_SUCCESS_URL;
  if (has(configured)) return configured;
  const base = process.env.PUBLIC_BASE_URL?.replace(/\/$/, "") || "http://localhost:3000";
  return `${base}/article/subscribe/success?checkout_id={CHECKOUT_ID}`;
}

function planFromInterval(interval: string | null): BillingInterval | null {
  return interval === "year" || interval === "annual"
    ? "annual"
    : interval === "month" || interval === "monthly"
      ? "monthly"
      : null;
}

export function mapPolarSubscriptionStatus(status: string): string {
  switch (status) {
    case "trialing":
      return "TRIALING";
    case "active":
      return "ACTIVE_PAID";
    case "past_due":
    case "unpaid":
      return "PAST_DUE";
    case "canceled":
      return "CANCELED";
    case "incomplete_expired":
      return "EXPIRED";
    case "incomplete":
    default:
      return "PENDING_CHECKOUT";
  }
}

export async function createPolarCheckoutForSubscription(
  sub: SubscriptionWithPrefs,
  email: string,
): Promise<string> {
  assertPolarConfigured("Polar checkout");

  const checkout = await getPolarClient().checkouts.create({
    products: [getPolarProductId()],
    customerEmail: email,
    externalCustomerId: sub.contactId,
    allowTrial: true,
    successUrl: checkoutSuccessUrl(),
    returnUrl: checkoutReturnUrl(),
    metadata: {
      contactId: sub.contactId,
      productSubscriptionId: sub.id,
      productKey: ONE_ARTICLE_PRODUCT_KEY,
      email,
    },
    customerMetadata: {
      contactId: sub.contactId,
      productKey: ONE_ARTICLE_PRODUCT_KEY,
      email,
    },
  });

  await prisma.productSubscription.update({
    where: { id: sub.id },
    data: {
      paymentProvider: PROVIDER,
      providerCheckoutSessionId: checkout.id,
    },
  });

  return checkout.url;
}

export async function createPolarCustomerPortalUrl(
  sub: SubscriptionWithPrefs,
): Promise<string> {
  assertPolarConfigured("Polar customer portal");
  const returnUrl = checkoutReturnUrl();
  const session = await getPolarClient().customerSessions.create(
    sub.providerCustomerId
      ? { customerId: sub.providerCustomerId, returnUrl }
      : { externalCustomerId: sub.contactId, returnUrl },
  );
  return session.customerPortalUrl;
}

export class PolarBillingProvider implements BillingProvider {
  readonly name = PROVIDER;

  async createCheckoutSession({
    email,
  }: CreateCheckoutArgs): Promise<CheckoutResult> {
    const sub = await findOneArticleSubscription(email);
    if (!sub) return { kind: "needs_setup_first" };
    if (!preferencesComplete(sub.preferences)) return { kind: "needs_setup" };

    if (
      sub.status === "ACTIVE_PAID" ||
      sub.status === "ADMIN_OVERRIDE" ||
      (sub.status === "TRIALING" &&
        sub.paymentProvider === PROVIDER &&
        sub.trialEndsAt &&
        new Date() < sub.trialEndsAt)
    ) {
      return {
        kind: "already_active",
        manageUrl: "/api/subscribe/portal",
      };
    }

    const url = await createPolarCheckoutForSubscription(sub, email);
    return { kind: "redirect", url };
  }

  async createBillingPortalSession(email: string): Promise<RedirectResult> {
    const sub = await findOneArticleSubscription(email);
    if (!sub) throw new Error("No subscription found.");
    if (!sub.providerCustomerId && sub.paymentProvider !== PROVIDER) {
      throw new Error("Polar customer is not available yet.");
    }
    return { url: await createPolarCustomerPortalUrl(sub) };
  }

  async getSubscriptionStatus(email: string): Promise<ProviderSubscriptionStatus | null> {
    const sub = await findOneArticleSubscription(email);
    if (!sub) return null;
    return {
      status: sub.status,
      plan: sub.plan,
      currentPeriodEnd: sub.currentPeriodEnd,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      provider: PROVIDER,
    };
  }

  async cancelSubscription(email: string): Promise<void> {
    const sub = await findOneArticleSubscription(email);
    if (!sub) throw new Error("No subscription found.");
    if (sub.paymentProvider !== PROVIDER || !sub.providerSubscriptionId) {
      throw new Error("No active Polar subscription is available to cancel.");
    }

    const canceled = await getPolarClient().subscriptions.update({
      id: sub.providerSubscriptionId,
      subscriptionUpdate: { cancelAtPeriodEnd: true },
    });

    await prisma.productSubscription.update({
      where: { id: sub.id },
      data: {
        status: mapPolarSubscriptionStatus(String(canceled.status)),
        cancelAtPeriodEnd: canceled.cancelAtPeriodEnd,
        canceledAt: canceled.canceledAt ?? new Date(),
        currentPeriodStart: canceled.currentPeriodStart ?? sub.currentPeriodStart,
        currentPeriodEnd: canceled.currentPeriodEnd ?? sub.currentPeriodEnd,
      },
    });
  }

  async resumeSubscription(): Promise<void> {
    throw new Error("Use the Polar customer portal to resume subscriptions.");
  }
}

type PolarData = Record<string, any>;

function metadataValue(data: PolarData, key: string): string | null {
  const value = data.metadata?.[key] ?? data.customer?.metadata?.[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

async function findSubscriptionForPolarData(data: PolarData) {
  const metadataSubId = metadataValue(data, "productSubscriptionId");
  if (metadataSubId) {
    const sub = await prisma.productSubscription.findUnique({
      where: { id: metadataSubId },
      include: { preferences: true },
    });
    if (sub) return sub;
  }

  const providerSubscriptionId = data.subscriptionId ?? data.id;
  if (typeof providerSubscriptionId === "string") {
    const sub = await prisma.productSubscription.findFirst({
      where: { providerSubscriptionId },
      include: { preferences: true },
    });
    if (sub) return sub;
  }

  const contactId =
    metadataValue(data, "contactId") ??
    (typeof data.customer?.externalId === "string" ? data.customer.externalId : null) ??
    (typeof data.externalCustomerId === "string" ? data.externalCustomerId : null);
  if (contactId) {
    const sub = await prisma.productSubscription.findUnique({
      where: {
        contactId_productKey: {
          contactId,
          productKey: ONE_ARTICLE_PRODUCT_KEY,
        },
      },
      include: { preferences: true },
    });
    if (sub) return sub;
  }

  const email =
    metadataValue(data, "email") ??
    (typeof data.customer?.email === "string" ? data.customer.email.toLowerCase() : null);
  return email ? findOneArticleSubscription(email) : null;
}

export async function applyPolarWebhookPayload(payload: {
  type: string;
  timestamp: Date;
  data: PolarData;
}) {
  const { type, data } = payload;
  if (
    !type.startsWith("checkout.") &&
    !type.startsWith("order.") &&
    !type.startsWith("subscription.") &&
    type !== "customer.state_changed"
  ) {
    return;
  }

  const sub = await findSubscriptionForPolarData(data);
  if (!sub) return;

  const update: Record<string, any> = {
    paymentProvider: PROVIDER,
  };

  const customerId = data.customerId ?? data.customer?.id;
  if (typeof customerId === "string") update.providerCustomerId = customerId;

  if (type.startsWith("checkout.")) {
    update.providerCheckoutSessionId = data.id;
  }

  if (type.startsWith("order.")) {
    if (typeof data.checkoutId === "string") {
      update.providerCheckoutSessionId = data.checkoutId;
    }
    if (typeof data.subscriptionId === "string") {
      update.providerSubscriptionId = data.subscriptionId;
    }
    if (type === "order.paid" || data.paid === true || data.status === "paid") {
      update.paidAt = payload.timestamp;
      if (data.subscriptionId) update.status = "ACTIVE_PAID";
    }
  }

  if (type.startsWith("subscription.")) {
    update.providerSubscriptionId = data.id;
    if (typeof data.checkoutId === "string") {
      update.providerCheckoutSessionId = data.checkoutId;
    }
    update.status =
      type === "subscription.revoked"
        ? "EXPIRED"
        : type === "subscription.past_due"
          ? "PAST_DUE"
          : mapPolarSubscriptionStatus(String(data.status));
    update.plan = planFromInterval(String(data.recurringInterval ?? "")) ?? sub.plan;
    update.currentPeriodStart = data.currentPeriodStart ?? null;
    update.currentPeriodEnd = data.currentPeriodEnd ?? data.endsAt ?? null;
    update.trialStartedAt = data.trialStart ?? null;
    update.trialEndsAt = data.trialEnd ?? null;
    update.trialUsedAt = data.trialStart ? data.trialStart : sub.trialUsedAt;
    update.cancelAtPeriodEnd = Boolean(data.cancelAtPeriodEnd);
    update.canceledAt = data.canceledAt ?? null;
    update.pastDueAt = type === "subscription.past_due" ? payload.timestamp : null;
    if (data.status === "active" || type === "subscription.active") {
      update.paidAt = sub.paidAt ?? payload.timestamp;
    }
  }

  await prisma.productSubscription.update({
    where: { id: sub.id },
    data: update,
  });
}
