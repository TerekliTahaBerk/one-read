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

export const BILLING_INTERVALS = ["monthly"] as const;
export type BillingInterval = (typeof BILLING_INTERVALS)[number];

/**
 * External Tally waitlist form for not-yet-launched products (OneLingo,
 * OneDish). Frontend-only — no waitlist backend. Swap this
 * URL when each product gets its own form.
 */
export const WAITLIST_FORM_URL =
  process.env.NEXT_PUBLIC_WAITLIST_FORM_URL || "https://tally.so/r/WOZWLe";

/** Product slug for the OneRead umbrella subscription (bundles OneArticle + OneFilm). */
export const ONE_READ_PRODUCT_KEY = "one-read";

/** Product slug for One Article (the first OneRead product). */
export const ONE_ARTICLE_PRODUCT_KEY = "one-article";

/** Product slug for OneLingo (the daily language-practice product). */
export const ONE_LINGO_PRODUCT_KEY = "one-lingo";

/** Product slug for OneFilm (the daily film-note product). */
export const ONE_FILM_PRODUCT_KEY = "one-film";

/* ----------------------------------------------------------------------- */
/* OneLingo option catalogs + validators                                   */
/* ----------------------------------------------------------------------- */

/** Languages a learner can study. */
export const LINGO_TARGET_LANGUAGES = [
  "English",
  "Spanish",
  "French",
  "German",
  "Italian",
  "Turkish",
] as const;
export type LingoTargetLanguage = (typeof LINGO_TARGET_LANGUAGES)[number];

/** Languages explanations can be written in (the learner's native language). */
export const LINGO_NATIVE_LANGUAGES = ["English", "Turkish"] as const;
export type LingoNativeLanguage = (typeof LINGO_NATIVE_LANGUAGES)[number];

export const LINGO_LEVELS = [
  "Beginner",
  "Elementary",
  "Intermediate",
  "Upper-intermediate",
  "Advanced",
] as const;
export type LingoLevel = (typeof LINGO_LEVELS)[number];

export const LINGO_GOALS = [
  "Travel",
  "Work",
  "School",
  "Conversation",
  "Reading",
  "Exam preparation",
  "General improvement",
] as const;
export type LingoGoal = (typeof LINGO_GOALS)[number];

export const LINGO_PRACTICE_STYLES = [
  "Vocabulary-first",
  "Phrase-first",
  "Grammar-light",
  "Real-life examples",
  "Mixed",
] as const;
export type LingoPracticeStyle = (typeof LINGO_PRACTICE_STYLES)[number];

export const LINGO_INTERESTS = [
  "Business",
  "Technology",
  "Travel",
  "Food",
  "Culture",
  "Daily life",
  "Work",
  "Movies",
  "Sports",
  "Books",
  "Social situations",
] as const;
export type LingoInterest = (typeof LINGO_INTERESTS)[number];

function makeMemberParser<T extends string>(
  allowed: readonly T[],
): (input: unknown) => T | null {
  const set = new Set<string>(allowed);
  return (input: unknown) =>
    typeof input === "string" && set.has(input) ? (input as T) : null;
}

export const parseLingoTargetLanguage = makeMemberParser(LINGO_TARGET_LANGUAGES);
export const parseLingoNativeLanguage = makeMemberParser(LINGO_NATIVE_LANGUAGES);
export const parseLingoLevel = makeMemberParser(LINGO_LEVELS);
export const parseLingoGoal = makeMemberParser(LINGO_GOALS);
export const parseLingoPracticeStyle = makeMemberParser(LINGO_PRACTICE_STYLES);

/** Validates a list of OneLingo interest labels (1+ allowed, deduped). */
export function parseLingoInterests(input: unknown): LingoInterest[] | null {
  if (!Array.isArray(input) || input.length === 0) return null;
  const allowed = new Set<string>(LINGO_INTERESTS);
  const seen = new Set<string>();
  const out: LingoInterest[] = [];
  for (const item of input) {
    if (typeof item !== "string" || !allowed.has(item)) return null;
    if (seen.has(item)) continue;
    seen.add(item);
    out.push(item as LingoInterest);
  }
  return out.length > 0 ? out : null;
}

/** Clamps minutes-per-day into a sane 3..20 range; defaults to 5. */
export function parseLingoMinutesPerDay(input: unknown): number {
  const n = typeof input === "number" ? input : Number(input);
  if (!Number.isFinite(n)) return 5;
  return Math.min(20, Math.max(3, Math.round(n)));
}

function makeListParser<T extends string>(
  allowed: readonly T[],
  { allowEmpty = false }: { allowEmpty?: boolean } = {},
): (input: unknown) => T[] | null {
  const set = new Set<string>(allowed);
  return (input: unknown) => {
    if (!Array.isArray(input)) return null;
    const seen = new Set<string>();
    const out: T[] = [];
    for (const item of input) {
      if (typeof item !== "string" || !set.has(item)) return null;
      if (seen.has(item)) continue;
      seen.add(item);
      out.push(item as T);
    }
    return out.length > 0 || allowEmpty ? out : null;
  };
}

/* ----------------------------------------------------------------------- */
/* OneFilm option catalogs + validators                                    */
/* ----------------------------------------------------------------------- */

export const FILM_EMAIL_LANGUAGES = ["English", "Turkish"] as const;
export type FilmEmailLanguage = (typeof FILM_EMAIL_LANGUAGES)[number];

export const FILM_GENRES = [
  "Drama",
  "Comedy",
  "Thriller",
  "Sci-fi",
  "Romance",
  "Documentary",
  "Crime",
  "Animation",
  "Horror",
  "Action",
  "Arthouse",
  "Classics",
] as const;
export type FilmGenre = (typeof FILM_GENRES)[number];

export const FILM_MOODS = [
  "Quiet",
  "Thoughtful",
  "Comforting",
  "Intense",
  "Strange",
  "Beautiful",
  "Funny",
  "Emotional",
  "Light",
  "Dark",
] as const;
export type FilmMood = (typeof FILM_MOODS)[number];

export const FILM_DECADES = [
  "New releases",
  "2020s",
  "2010s",
  "2000s",
  "1990s",
  "Classics",
] as const;
export type FilmDecade = (typeof FILM_DECADES)[number];

export const FILM_LANGUAGES = [
  "English",
  "Turkish",
  "French",
  "Korean",
  "Japanese",
  "Spanish",
  "Italian",
  "Any",
] as const;
export type FilmLanguage = (typeof FILM_LANGUAGES)[number];

export const FILM_PLATFORMS = [
  "Netflix",
  "Mubi",
  "Prime Video",
  "Disney+",
  "Apple TV",
  "BluTV",
  "Theaters",
  "Any",
] as const;
export type FilmPlatform = (typeof FILM_PLATFORMS)[number];

export const FILM_SPOILER_PREFERENCES = [
  "Spoiler-free",
  "Spoiler-light",
  "Full analysis allowed",
] as const;
export type FilmSpoilerPreference = (typeof FILM_SPOILER_PREFERENCES)[number];

export const FILM_FAMILIARITIES = [
  "Popular films",
  "Hidden gems",
  "Classics",
  "Mixed",
] as const;
export type FilmFamiliarity = (typeof FILM_FAMILIARITIES)[number];

export const FILM_RUNTIME_PREFERENCES = [
  "Under 90 minutes",
  "90–120 minutes",
  "Long films are fine",
  "Any",
] as const;
export type FilmRuntimePreference = (typeof FILM_RUNTIME_PREFERENCES)[number];

export const parseFilmEmailLanguage = makeMemberParser(FILM_EMAIL_LANGUAGES);
export const parseFilmSpoilerPreference = makeMemberParser(FILM_SPOILER_PREFERENCES);
export const parseFilmFamiliarity = makeMemberParser(FILM_FAMILIARITIES);
export const parseFilmRuntimePreference = makeMemberParser(FILM_RUNTIME_PREFERENCES);

export const parseFilmGenres = makeListParser(FILM_GENRES);
export const parseFilmMoods = makeListParser(FILM_MOODS);
export const parseFilmDecades = makeListParser(FILM_DECADES, { allowEmpty: true });
export const parseFilmLanguages = makeListParser(FILM_LANGUAGES, { allowEmpty: true });
export const parseFilmPlatforms = makeListParser(FILM_PLATFORMS, { allowEmpty: true });

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
