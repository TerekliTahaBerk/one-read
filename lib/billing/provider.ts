import type { BillingProvider, BillingProviderName } from "./types";
import { MockBillingProvider } from "./mock";
import { PolarBillingProvider } from "./polar";

/**
 * Resolves the active billing provider from BILLING_PROVIDER. Defaults to
 * "mock" so local/dev works with no configuration. Stripe / Lemon Squeezy
 * implementations register here in later phases.
 */
export function getBillingProviderName(): BillingProviderName {
  const raw = (process.env.BILLING_PROVIDER ?? "mock").toLowerCase();
  if (raw === "polar" || raw === "stripe" || raw === "lemonsqueezy" || raw === "mock") return raw;
  return "mock";
}

/** True when billing is configured (any provider selected). */
export function isBillingConfigured(): boolean {
  return Boolean(process.env.BILLING_PROVIDER);
}

let cached: BillingProvider | null = null;

export function getBillingProvider(): BillingProvider {
  if (cached) return cached;
  const name = getBillingProviderName();
  switch (name) {
    case "mock":
      cached = new MockBillingProvider();
      break;
    case "polar":
      cached = new PolarBillingProvider();
      break;
    // Phase 6: case "stripe": cached = new StripeBillingProvider(); break;
    default:
      // No real provider implemented yet — fall back to mock so dev keeps
      // working. Production safety for mock lives in lib/billing/mock.ts.
      cached = new MockBillingProvider();
  }
  return cached;
}
