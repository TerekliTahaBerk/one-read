import type { BillingInterval } from "@/lib/options";
import { prisma } from "@/lib/prisma";
import { findOneArticleSubscription, preferencesComplete } from "@/lib/subscriptions";
import type {
  BillingProvider,
  CheckoutResult,
  CreateCheckoutArgs,
  ProviderSubscriptionStatus,
  RedirectResult,
} from "./types";

/**
 * Dev/test billing provider. It performs NO real charges and talks to NO
 * external service — it just drives ProductSubscription state so the whole
 * paid lifecycle (checkout → active → cancel → resume → past-due → recover)
 * can be exercised locally. Selected with BILLING_PROVIDER=mock.
 *
 * Mock state is mutated by the local mock-checkout / mock-portal pages, which
 * call the /api/subscribe/mock-* endpoints. Those endpoints (and these helpers)
 * must never run in production unless explicitly opted in — see isMockAllowed.
 */

const PROVIDER = "mock" as const;
const MOCK_CUSTOMER_PREFIX = "mock_cus_";
const MOCK_SUB_PREFIX = "mock_sub_";

/**
 * Whether mock billing is permitted in the current environment. Mock is a
 * dev/test tool: blocked in production unless MOCK_BILLING_PREVIEW=true is set
 * deliberately (e.g. a staging preview). Real fake-paid access is never created
 * silently in prod.
 */
export function isMockAllowed(): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  return process.env.MOCK_BILLING_PREVIEW === "true";
}

/** Adds one plan interval (1 month / 1 year) to a date. */
export function addInterval(from: Date, plan: BillingInterval): Date {
  const d = new Date(from);
  if (plan === "annual") d.setUTCFullYear(d.getUTCFullYear() + 1);
  else d.setUTCMonth(d.getUTCMonth() + 1);
  return d;
}

/**
 * Completes a (mock) checkout for an email: marks the subscription ACTIVE_PAID
 * and stamps provider/plan/period fields.
 *
 * Product decision: paying during the trial honors the remaining free days —
 * the paid period begins at trialEndsAt, not now. Access still becomes
 * ACTIVE_PAID immediately because payment is secured. If the trial already
 * ended (or there is no future trial), the period starts now.
 */
export async function completeMockCheckout(
  email: string,
  plan: BillingInterval,
  now: Date = new Date(),
): Promise<{ ok: boolean; reason?: string }> {
  const sub = await findOneArticleSubscription(email);
  if (!sub) return { ok: false, reason: "no_subscription" };
  if (!preferencesComplete(sub.preferences)) return { ok: false, reason: "incomplete_preferences" };

  const trialActive = sub.trialEndsAt != null && now < sub.trialEndsAt;
  const periodStart = trialActive ? sub.trialEndsAt! : now;
  const periodEnd = addInterval(periodStart, plan);

  await prisma.productSubscription.update({
    where: { id: sub.id },
    data: {
      status: "ACTIVE_PAID",
      plan,
      paymentProvider: PROVIDER,
      providerCustomerId: sub.providerCustomerId ?? `${MOCK_CUSTOMER_PREFIX}${sub.id}`,
      providerSubscriptionId: sub.providerSubscriptionId ?? `${MOCK_SUB_PREFIX}${sub.id}`,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
      canceledAt: null,
      pastDueAt: null,
      paidAt: now,
      // emailDeliveryStatus is intentionally left untouched (don't re-enable a
      // user who unsubscribed; don't clear SUPPRESSED).
    },
  });
  return { ok: true };
}

export async function mockCancelAtPeriodEnd(email: string, now: Date = new Date()) {
  const sub = await findOneArticleSubscription(email);
  if (!sub) return { ok: false, reason: "no_subscription" };
  if (sub.status !== "ACTIVE_PAID") return { ok: false, reason: "not_active_paid" };
  await prisma.productSubscription.update({
    where: { id: sub.id },
    data: { status: "CANCELED", cancelAtPeriodEnd: true, canceledAt: now },
  });
  return { ok: true };
}

export async function mockResume(email: string, now: Date = new Date()) {
  const sub = await findOneArticleSubscription(email);
  if (!sub) return { ok: false, reason: "no_subscription" };
  // Only resumable while still inside the paid period.
  if (sub.status !== "CANCELED" || !sub.currentPeriodEnd || now >= sub.currentPeriodEnd) {
    return { ok: false, reason: "not_resumable" };
  }
  await prisma.productSubscription.update({
    where: { id: sub.id },
    data: { status: "ACTIVE_PAID", cancelAtPeriodEnd: false, canceledAt: null },
  });
  return { ok: true };
}

export async function mockPaymentFailed(email: string, now: Date = new Date()) {
  const sub = await findOneArticleSubscription(email);
  if (!sub) return { ok: false, reason: "no_subscription" };
  if (sub.status !== "ACTIVE_PAID") return { ok: false, reason: "not_active_paid" };
  await prisma.productSubscription.update({
    where: { id: sub.id },
    data: { status: "PAST_DUE", pastDueAt: now },
  });
  return { ok: true };
}

export async function mockPaymentRecovered(email: string, now: Date = new Date()) {
  const sub = await findOneArticleSubscription(email);
  if (!sub) return { ok: false, reason: "no_subscription" };
  if (sub.status !== "PAST_DUE") return { ok: false, reason: "not_past_due" };
  await prisma.productSubscription.update({
    where: { id: sub.id },
    data: { status: "ACTIVE_PAID", pastDueAt: null, paidAt: now },
  });
  return { ok: true };
}

export class MockBillingProvider implements BillingProvider {
  readonly name = PROVIDER;

  async createCheckoutSession({ email, plan }: CreateCheckoutArgs): Promise<CheckoutResult> {
    const sub = await findOneArticleSubscription(email);
    if (!sub) return { kind: "needs_setup_first" };
    if (!preferencesComplete(sub.preferences)) return { kind: "needs_setup" };
    if (sub.status === "ACTIVE_PAID") {
      return {
        kind: "already_active",
        manageUrl: `/article/subscribe/mock-portal?email=${encodeURIComponent(email)}`,
      };
    }
    // Mock "session": a local page that completes the (fake) payment.
    const url = `/article/subscribe/mock-checkout?email=${encodeURIComponent(
      email,
    )}&plan=${plan}`;
    return { kind: "redirect", url };
  }

  async createBillingPortalSession(email: string): Promise<RedirectResult> {
    return { url: `/article/subscribe/mock-portal?email=${encodeURIComponent(email)}` };
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
    await mockCancelAtPeriodEnd(email);
  }

  async resumeSubscription(email: string): Promise<void> {
    await mockResume(email);
  }
}
