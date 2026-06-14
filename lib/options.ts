export const INTERESTS = [
  "Artificial Intelligence",
  "Startups",
  "Business",
  "Technology",
  "Psychology",
  "Science",
  "Design",
  "Finance",
  "Productivity",
  "Culture",
] as const;

export type Interest = (typeof INTERESTS)[number];

export const SOURCE_LANGUAGES = ["English", "Turkish", "Any"] as const;
export type SourceLanguage = (typeof SOURCE_LANGUAGES)[number];

export const SUMMARY_LANGUAGES = ["English", "Turkish"] as const;
export type SummaryLanguage = (typeof SUMMARY_LANGUAGES)[number];

/**
 * Light email validation. Intentionally permissive –
 * server side will be the source of truth.
 */
export const isLikelyEmail = (value: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
