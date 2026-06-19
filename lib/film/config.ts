/**
 * OneFilm product configuration — single source of truth for public copy,
 * pricing, and delivery timing. Kept separate from the other products so they
 * can diverge freely.
 */

import { ONE_FILM_PRODUCT_KEY } from "@/lib/options";

export const FILM_PRODUCT_KEY = ONE_FILM_PRODUCT_KEY;

export const FILM_PRODUCT = {
  key: FILM_PRODUCT_KEY,
  name: "OneFilm",
  status: "Available" as const,
  shortDescription: "One film worth thinking about, delivered to your inbox.",
  longDescription:
    "OneFilm sends one thoughtful film note or recommendation — a calmer way to choose what to watch.",
  cta: "Start free trial",
  corePromise: "One film worth thinking about, delivered to your inbox.",
} as const;

export const FILM_PRICING = {
  monthly: 2,
  yearly: 18,
} as const;

export const FILM_TRUST_NOTES = [
  "7-day free trial included",
  "Cancel anytime",
  "One film note in your inbox",
  "Billing handled securely by Polar",
] as const;

export function filmSendHourLocal(): number {
  const raw = Number(process.env.ONEFILM_SEND_HOUR_LOCAL);
  return Number.isFinite(raw) && raw >= 0 && raw <= 23 ? Math.floor(raw) : 7;
}

export function filmTimezone(): string {
  return process.env.ONEFILM_TIMEZONE?.trim() || "Europe/Istanbul";
}

export function filmRequireApproval(): boolean {
  return process.env.ONEFILM_REQUIRE_APPROVAL !== "false";
}

export function filmCronEnabled(): boolean {
  return process.env.ONEFILM_CRON_ENABLED === "true";
}

export function filmDryRunForced(): boolean {
  return process.env.ONEFILM_DRY_RUN === "true";
}

/** "manual" | "api" — film metadata source mode. Manual is safest for launch. */
export function filmSourceMode(): "manual" | "api" {
  return process.env.ONEFILM_SOURCE_MODE?.trim().toLowerCase() === "api"
    ? "api"
    : "manual";
}

/** Optional film-metadata provider API key. Never invents data when missing. */
export function filmSourceApiKey(): string | null {
  return process.env.ONEFILM_FILM_SOURCE_API_KEY?.trim() || null;
}

/**
 * The OneFilm Polar product id. Never falls back to another product's id.
 * Returns null when unconfigured so callers render a safe "billing not
 * configured" state instead of crashing.
 */
export function filmPolarProductId(): string | null {
  const id =
    process.env.POLAR_ONEFILM_PRODUCT_ID?.trim() ||
    process.env.POLAR_ONE_FILM_PRODUCT_ID?.trim();
  return id ? id : null;
}

export function filmBillingConfigured(): boolean {
  return filmPolarProductId() !== null;
}
