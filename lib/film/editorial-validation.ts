import { FILM_EMAIL_LANGUAGES } from "@/lib/options";

export interface FilmEditorialContentInput {
  emailLanguage: string;
  subject: string;
  previewText?: string | null;
  filmTitle: string;
  bodyText: string;
  heroImageUrl?: string | null;
  heroImageAlt?: string | null;
  heroImageCredit?: string | null;
  filmYear?: number | null;
  director?: string | null;
  filmLanguage?: string | null;
  runtimeMinutes?: number | null;
  sourceName?: string | null;
  sourceUrl?: string | null;
  ctaLabel?: string | null;
  adminNotes?: string | null;
}

export type FilmEditorialCheck = { key: string; label: string; passed: boolean };

export function filmEditorialReadinessChecks(
  input: FilmEditorialContentInput,
): FilmEditorialCheck[] {
  return [
    { key: "subject", label: "Email subject is written", passed: input.subject.trim().length > 0 },
    { key: "filmTitle", label: "Film title is written", passed: input.filmTitle.trim().length > 0 },
    { key: "body", label: "Film note has at least 120 words", passed: filmEditorialWordCount(input.bodyText) >= 120 },
    { key: "heroImageUrl", label: "Optional cover image uses a valid HTTPS URL", passed: !input.heroImageUrl?.trim() || safeHttpsUrl(input.heroImageUrl) },
    { key: "heroImageAlt", label: "Added cover image has accessible alt text", passed: !input.heroImageUrl?.trim() || Boolean(input.heroImageAlt?.trim()) },
    { key: "director", label: "Director is recorded", passed: Boolean(input.director?.trim()) },
    { key: "filmYear", label: "Release year is valid", passed: validYear(input.filmYear) },
    { key: "sourceUrl", label: "Reference link is valid", passed: Boolean(input.sourceUrl?.trim() && safeHttpUrl(input.sourceUrl)) },
  ];
}

export function validateFilmEditorialDraft(
  input: FilmEditorialContentInput,
): { ok: true } | { ok: false; error: string } {
  if (!(FILM_EMAIL_LANGUAGES as readonly string[]).includes(input.emailLanguage)) {
    return { ok: false, error: "invalid_email_language" };
  }
  if (input.subject.trim().length > 160) return { ok: false, error: "subject_too_long" };
  if ((input.previewText ?? "").trim().length > 240) return { ok: false, error: "preview_too_long" };
  if ((input.heroImageAlt ?? "").trim().length > 240) return { ok: false, error: "hero_image_alt_too_long" };
  if (input.heroImageUrl?.trim() && !safeHttpsUrl(input.heroImageUrl)) return { ok: false, error: "invalid_hero_image_url" };
  if (input.sourceUrl?.trim() && !safeHttpUrl(input.sourceUrl)) return { ok: false, error: "invalid_source_url" };
  if (input.filmYear != null && !validYear(input.filmYear)) return { ok: false, error: "invalid_film_year" };
  if (input.runtimeMinutes != null && (!Number.isInteger(input.runtimeMinutes) || input.runtimeMinutes < 1 || input.runtimeMinutes > 600)) {
    return { ok: false, error: "invalid_runtime" };
  }
  return { ok: true };
}

export function validateFilmEditorialIssue(
  input: FilmEditorialContentInput,
): { ok: true } | { ok: false; error: string } {
  const draft = validateFilmEditorialDraft(input);
  if (!draft.ok) return draft;
  const failed = filmEditorialReadinessChecks(input).find((check) => !check.passed);
  if (!failed) return { ok: true };
  const errors: Record<string, string> = {
    subject: "subject_required",
    filmTitle: "film_title_required",
    body: "body_too_short",
    heroImageUrl: "invalid_hero_image_url",
    heroImageAlt: "hero_image_alt_required",
    director: "director_required",
    filmYear: "film_year_required",
    sourceUrl: input.sourceUrl?.trim() ? "invalid_source_url" : "source_url_required",
  };
  return { ok: false, error: errors[failed.key] ?? "edition_not_ready" };
}

export function filmEditorialWordCount(value: string): number {
  const text = value.trim();
  return text ? text.split(/\s+/u).length : 0;
}

function validYear(value: number | null | undefined): boolean {
  return Number.isInteger(value) && Number(value) >= 1888 && Number(value) <= new Date().getFullYear() + 2;
}

function safeHttpsUrl(value: string): boolean {
  try { return new URL(value).protocol === "https:"; } catch { return false; }
}

function safeHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch { return false; }
}
