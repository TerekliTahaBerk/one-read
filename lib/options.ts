import { UI_INTEREST_LABELS, type UIInterestLabel } from "./topics";

/**
 * Interests shown in the signup form. Single source of truth is the topic
 * catalog (`lib/topics.ts`) — re-exported here so existing imports keep
 * working and the form, validators, and backend can never drift apart.
 */
export const INTERESTS = UI_INTEREST_LABELS;
export type Interest = UIInterestLabel;

/**
 * Languages a subscriber can prefer their *source* articles in. "Any" means
 * no preference. We only list languages we actually have curated feeds for
 * (see `lib/sources.ts`); otherwise the preference would never be satisfiable.
 */
export const SOURCE_LANGUAGES = [
  "English",
  "Turkish",
  "Spanish",
  "French",
  "German",
  "Any",
] as const;
export type SourceLanguage = (typeof SOURCE_LANGUAGES)[number];

/**
 * Languages a subscriber can receive their summary in. The LLM translates
 * from the (English) source into any of these — see `lib/i18n.ts` for the
 * matching email/UI chrome strings.
 */
export const SUMMARY_LANGUAGES = [
  "English",
  "Turkish",
  "Spanish",
  "French",
  "German",
] as const;
export type SummaryLanguage = (typeof SUMMARY_LANGUAGES)[number];

export const BILLING_INTERVALS = ["monthly", "annual"] as const;
export type BillingInterval = (typeof BILLING_INTERVALS)[number];

/**
 * External Tally waitlist form for not-yet-launched products (OneLingo,
 * OneGoal). Frontend-only — no waitlist backend. Swap this URL when each
 * product gets its own form.
 */
export const WAITLIST_FORM_URL = "https://tally.so/r/WOZWLe";

/** Product slug for One Article (the first OneRead product). */
export const ONE_ARTICLE_PRODUCT_KEY = "one-article";

/** Free-trial length in days. Overridable via env for testing. */
export const TRIAL_DAYS = Number(process.env.TRIAL_DAYS ?? 7);

/**
 * How long a PAST_DUE subscription keeps receiving emails after a failed
 * payment before access is cut off. Overridable via env.
 */
export const PAST_DUE_GRACE_DAYS = Number(process.env.PAST_DUE_GRACE_DAYS ?? 3);

/**
 * Single source of truth for pricing, shared by the pricing page and the
 * (simulated) payment step.
 */
export const PRICING = {
  monthly: 2,
  annual: 18,
  annualSavingsPct: 25,
} as const;

/**
 * The complete list of capabilities, surfaced on the pricing page and the
 * payment step.
 */
export const FEATURES = [
  "One carefully chosen article every morning at 7 AM",
  "Chosen around your reading interests",
  "English and Turkish briefs",
  "Source-language preferences",
  "Edit your preferences anytime",
  "One-click cancel — no questions asked",
] as const;

/**
 * Emails that are always treated as subscribed (e.g. the founder's own
 * address for demos). Compared case-insensitively against the parsed email.
 */
export const ALWAYS_SUBSCRIBED_EMAILS = new Set<string>(["tterekli9@gmail.com"]);

export const isAlwaysSubscribed = (email: string): boolean =>
  ALWAYS_SUBSCRIBED_EMAILS.has(email.trim().toLowerCase());

/**
 * Light email validation. Intentionally permissive –
 * server side will be the source of truth.
 */
export const isLikelyEmail = (value: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());

/* ----------------------------------------------------------------------- */
/* Server-side validators                                                  */
/* ----------------------------------------------------------------------- */

export function parseEmail(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim().toLowerCase();
  if (!isLikelyEmail(trimmed)) return null;
  if (trimmed.length > 254) return null;
  return trimmed;
}

export function parseInterests(input: unknown): Interest[] | null {
  if (!Array.isArray(input)) return null;
  if (input.length === 0) return null;
  const allowed = new Set<string>(INTERESTS);
  const seen = new Set<string>();
  const out: Interest[] = [];
  for (const item of input) {
    if (typeof item !== "string") return null;
    if (!allowed.has(item)) return null;
    if (seen.has(item)) continue;
    seen.add(item);
    out.push(item as Interest);
  }
  return out.length > 0 ? out : null;
}

export function parseSourceLanguage(input: unknown): SourceLanguage | null {
  if (typeof input !== "string") return null;
  return (SOURCE_LANGUAGES as readonly string[]).includes(input)
    ? (input as SourceLanguage)
    : null;
}

export function parseSummaryLanguage(input: unknown): SummaryLanguage | null {
  if (typeof input !== "string") return null;
  return (SUMMARY_LANGUAGES as readonly string[]).includes(input)
    ? (input as SummaryLanguage)
    : null;
}

export function parseBillingInterval(input: unknown): BillingInterval | null {
  if (typeof input !== "string") return null;
  return (BILLING_INTERVALS as readonly string[]).includes(input)
    ? (input as BillingInterval)
    : null;
}
