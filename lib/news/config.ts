/**
 * OneNews product configuration — the single source of truth for the product's
 * public copy, pricing, and delivery timing. Kept separate from OneArticle /
 * OneLingo config so the products can diverge freely. Pricing is config-driven
 * so the pricing page, landing copy, and checkout step read the same numbers.
 */

import { ONE_NEWS_PRODUCT_KEY } from "@/lib/options";

export const NEWS_PRODUCT_KEY = ONE_NEWS_PRODUCT_KEY;

export const NEWS_PRODUCT = {
  key: NEWS_PRODUCT_KEY,
  name: "OneNews",
  status: "Available" as const,
  shortDescription: "A calmer morning briefing, every day at 7 AM.",
  longDescription:
    "OneNews sends a short morning briefing for the stories worth knowing — clear, calm, and made for your inbox.",
  cta: "Start free trial",
  corePromise: "A calmer morning briefing, every day at 7 AM.",
} as const;

/** Prices in whole units of the billing currency (USD). Polar is the truth. */
export const NEWS_PRICING = {
  monthly: 2,
  yearly: 18,
} as const;

export const NEWS_TRUST_NOTES = [
  "7-day free trial included",
  "Cancel anytime",
  "One briefing every morning at 7 AM",
  "Billing handled securely by Polar",
] as const;

/** Local send hour (0–23). Defaults to 7 AM. */
export function newsSendHourLocal(): number {
  const raw = Number(process.env.ONENEWS_SEND_HOUR_LOCAL);
  return Number.isFinite(raw) && raw >= 0 && raw <= 23 ? Math.floor(raw) : 7;
}

/** IANA timezone used to anchor the local send hour. */
export function newsTimezone(): string {
  return process.env.ONENEWS_TIMEZONE?.trim() || "Europe/Istanbul";
}

/** True when admin approval is required before an issue can be sent. */
export function newsRequireApproval(): boolean {
  // Safer default: approval required unless explicitly disabled.
  return process.env.ONENEWS_REQUIRE_APPROVAL !== "false";
}

/** True only when the OneNews cron is explicitly enabled. Off by default. */
export function newsCronEnabled(): boolean {
  return process.env.ONENEWS_CRON_ENABLED === "true";
}

/** Env-forced dry run for the pipeline (extra safety net for prod toggling). */
export function newsDryRunForced(): boolean {
  return process.env.ONENEWS_DRY_RUN === "true";
}

/** "manual" | "rss" — the source ingestion mode. Manual is safest for launch. */
export function newsSourceMode(): "manual" | "rss" {
  return process.env.ONENEWS_SOURCE_MODE?.trim().toLowerCase() === "rss"
    ? "rss"
    : "manual";
}

/** Allowed RSS source URLs (only used when source mode is "rss"). */
export function newsAllowedSources(): string[] {
  return (process.env.ONENEWS_ALLOWED_SOURCES ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * The OneNews Polar product id. Never falls back to another product's id.
 * Returns null when unconfigured so callers can render a safe "billing not
 * configured" state instead of crashing.
 */
export function newsPolarProductId(): string | null {
  const id =
    process.env.POLAR_ONENEWS_PRODUCT_ID?.trim() ||
    process.env.POLAR_ONE_NEWS_PRODUCT_ID?.trim();
  return id ? id : null;
}

/** True when OneNews billing is fully configured (Polar product id present). */
export function newsBillingConfigured(): boolean {
  return newsPolarProductId() !== null;
}
