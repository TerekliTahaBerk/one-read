/**
 * OneLingo product configuration — the single source of truth for the
 * product's public copy, pricing, and delivery timing. Kept separate from
 * OneArticle config so the two products can diverge freely.
 *
 * Pricing is config-driven here so the pricing page, the public landing copy,
 * and the checkout step all read the same numbers.
 */

import { ONE_LINGO_PRODUCT_KEY } from "@/lib/options";

export const LINGO_PRODUCT_KEY = ONE_LINGO_PRODUCT_KEY;

export const LINGO_PRODUCT = {
  key: LINGO_PRODUCT_KEY,
  name: "OneLingo",
  status: "Available" as const,
  shortDescription: "Small language practice, every morning at 7 AM.",
  longDescription:
    "OneLingo sends a short daily language practice email based on your level, goals, and interests — made to fit into a quiet morning routine.",
  cta: "Start free trial",
  corePromise: "Small language practice, every morning at 7 AM.",
} as const;

/**
 * Prices in whole units of the billing currency (USD). Polar holds the real
 * source of truth; these drive display only.
 */
export const LINGO_PRICING = {
  monthly: 2,
  yearly: 18,
} as const;

export const LINGO_TRUST_NOTES = [
  "7-day free trial included",
  "Cancel anytime",
  "One practice email every morning at 7 AM",
  "Billing handled securely by Polar",
] as const;

/** Local send hour (0–23). Defaults to 7 AM. */
export function lingoSendHourLocal(): number {
  const raw = Number(process.env.ONELINGO_SEND_HOUR_LOCAL);
  return Number.isFinite(raw) && raw >= 0 && raw <= 23 ? Math.floor(raw) : 7;
}

/** IANA timezone used to anchor the local send hour. */
export function lingoTimezone(): string {
  return process.env.ONELINGO_TIMEZONE?.trim() || "Europe/Istanbul";
}

/** True when admin approval is required before a lesson can be sent. */
export function lingoRequireApproval(): boolean {
  // Safer default: approval required unless explicitly disabled.
  return process.env.ONELINGO_REQUIRE_APPROVAL !== "false";
}

/** True only when the OneLingo cron is explicitly enabled. Off by default. */
export function lingoCronEnabled(): boolean {
  return process.env.ONELINGO_CRON_ENABLED === "true";
}

/** Env-forced dry run for the pipeline (extra safety net for prod toggling). */
export function lingoDryRunForced(): boolean {
  return process.env.ONELINGO_DRY_RUN === "true";
}

/**
 * The OneLingo Polar product id. Never falls back to the OneArticle id. Returns
 * null when unconfigured so callers can render a safe "billing not configured"
 * state instead of crashing.
 */
export function lingoPolarProductId(): string | null {
  const id =
    process.env.POLAR_ONE_LINGO_PRODUCT_ID?.trim() ||
    process.env.POLAR_ONELINGO_PRODUCT_ID?.trim();
  return id ? id : null;
}

/** True when OneLingo billing is fully configured (Polar product id present). */
export function lingoBillingConfigured(): boolean {
  return lingoPolarProductId() !== null;
}
