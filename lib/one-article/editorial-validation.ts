import { SUMMARY_LANGUAGES } from "@/lib/options";

export interface EditorialContentInput {
  readingLanguage: string;
  subject: string;
  previewText?: string | null;
  headline: string;
  bodyText: string;
  heroImageUrl?: string | null;
  heroImageAlt?: string | null;
  heroImageCredit?: string | null;
  sourceTitle?: string | null;
  sourceName?: string | null;
  sourceUrl?: string | null;
  ctaLabel?: string | null;
  adminNotes?: string | null;
}

export type EditorialCheck = {
  key: string;
  label: string;
  passed: boolean;
};

export function editorialReadinessChecks(
  input: EditorialContentInput,
): EditorialCheck[] {
  return [
    { key: "subject", label: "Email subject is written", passed: input.subject.trim().length > 0 },
    { key: "headline", label: "Headline is written", passed: input.headline.trim().length > 0 },
    {
      key: "body",
      label: "Article has at least 120 words",
      passed: editorialWordCount(input.bodyText) >= 120,
    },
    {
      key: "heroImageUrl",
      label: "Optional cover image uses a valid HTTPS URL",
      passed: !input.heroImageUrl?.trim() || safeHttpsUrl(input.heroImageUrl),
    },
    {
      key: "heroImageAlt",
      label: "Added cover image has accessible alt text",
      passed: !input.heroImageUrl?.trim() || Boolean(input.heroImageAlt?.trim()),
    },
    {
      key: "sourceTitle",
      label: "Original article title is recorded",
      passed: Boolean(input.sourceTitle?.trim()),
    },
    {
      key: "sourceUrl",
      label: "Original article link is valid",
      passed: Boolean(input.sourceUrl?.trim() && safeHttpUrl(input.sourceUrl)),
    },
  ];
}

export function validateEditorialDraft(
  input: EditorialContentInput,
): { ok: true } | { ok: false; error: string } {
  if (!(SUMMARY_LANGUAGES as readonly string[]).includes(input.readingLanguage)) {
    return { ok: false, error: "invalid_reading_language" };
  }
  if (input.subject.trim().length > 160) return { ok: false, error: "subject_too_long" };
  if ((input.previewText ?? "").trim().length > 240) {
    return { ok: false, error: "preview_too_long" };
  }
  if (input.sourceUrl?.trim() && !safeHttpUrl(input.sourceUrl)) {
    return { ok: false, error: "invalid_source_url" };
  }
  if (input.heroImageUrl?.trim() && !safeHttpsUrl(input.heroImageUrl)) {
    return { ok: false, error: "invalid_hero_image_url" };
  }
  if ((input.heroImageAlt ?? "").trim().length > 240) {
    return { ok: false, error: "hero_image_alt_too_long" };
  }
  return { ok: true };
}

export function validateEditorialIssue(
  input: EditorialContentInput,
): { ok: true } | { ok: false; error: string } {
  const draft = validateEditorialDraft(input);
  if (!draft.ok) return draft;
  const failed = editorialReadinessChecks(input).find((check) => !check.passed);
  if (!failed) return { ok: true };
  const errors: Record<string, string> = {
    subject: "subject_required",
    headline: "headline_required",
    body: "body_too_short",
    heroImageUrl: "invalid_hero_image_url",
    heroImageAlt: "hero_image_alt_required",
    sourceTitle: "source_title_required",
    sourceUrl: input.sourceUrl?.trim() ? "invalid_source_url" : "source_url_required",
  };
  return { ok: false, error: errors[failed.key] ?? "edition_not_ready" };
}

export function validateEditorialTest(
  input: EditorialContentInput,
): { ok: true } | { ok: false; error: string } {
  const draft = validateEditorialDraft(input);
  if (!draft.ok) return draft;
  if (!input.subject.trim()) return { ok: false, error: "subject_required" };
  if (!input.headline.trim()) return { ok: false, error: "headline_required" };
  if (!input.bodyText.trim()) return { ok: false, error: "body_required_for_test" };
  return { ok: true };
}

export function editorialWordCount(value: string): number {
  const text = value.trim();
  return text ? text.split(/\s+/u).length : 0;
}

function safeHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function safeHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
