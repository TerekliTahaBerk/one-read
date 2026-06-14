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
