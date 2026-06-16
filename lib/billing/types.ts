import type { BillingInterval } from "@/lib/options";

/**
 * Provider-agnostic billing interface. The daily pipeline, signup, and the
 * subscribe flow never talk to a payment provider directly — they go through a
 * BillingProvider implementation resolved by lib/billing/provider.ts. Today the
 * only implementation is the dev/test `mock` provider (lib/billing/mock.ts);
 * Stripe / Lemon Squeezy slot in here later without touching callers.
 */

export type BillingProviderName = "mock" | "stripe" | "lemonsqueezy";

/** Where the user should be sent to complete or manage billing. */
export interface RedirectResult {
  url: string;
}

/** Outcome of a checkout request before the user is redirected. */
export type CheckoutResult =
  | { kind: "redirect"; url: string }
  /** No subscription yet — the UI should send them to start a trial. */
  | { kind: "needs_trial" }
  /** Preferences incomplete — finish setup before paying. */
  | { kind: "needs_setup" }
  /** Already paying — send them to manage billing instead of double-charging. */
  | { kind: "already_active"; manageUrl: string };

export interface CreateCheckoutArgs {
  email: string;
  plan: BillingInterval;
}

export interface ProviderSubscriptionStatus {
  status: string;
  plan: string | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  provider: BillingProviderName;
}

export interface BillingProvider {
  readonly name: BillingProviderName;

  createCheckoutSession(args: CreateCheckoutArgs): Promise<CheckoutResult>;

  createBillingPortalSession(email: string): Promise<RedirectResult>;

  getSubscriptionStatus(email: string): Promise<ProviderSubscriptionStatus | null>;

  cancelSubscription(email: string): Promise<void>;

  resumeSubscription(email: string): Promise<void>;
}
