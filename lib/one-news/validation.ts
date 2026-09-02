import { SUMMARY_LANGUAGES } from "@/lib/options";
import { isSafeHttpUrl, sourceHostLabel } from "@/lib/editorial/url-safety";

/**
 * Editorial validation for OneNews.
 *
 * The split is deliberate and is the whole point of this module:
 *
 * - **Errors** are structural facts software can actually establish — a
 *   required section is empty, a link is unsafe, a developing story has no
 *   `asOf`. They block READY.
 * - **Warnings** are things a human should look at. They never block, because
 *   the software cannot tell a thin story from a well-sourced short one.
 *
 * Nothing here scores credibility, bias or balance. Software can count
 * sources; it cannot decide whether a publication is trustworthy or whether a
 * story has "another side". That stays with the editor.
 */

export const ONE_NEWS_SOURCE_TYPES = [
  "PRIMARY",
  "REPORTING",
  "ANALYSIS",
  "RESEARCH",
  "DATA",
  "OTHER",
] as const;

export type OneNewsSourceType = (typeof ONE_NEWS_SOURCE_TYPES)[number];

/** Editorial guidance, not a gate. Breaching it produces a warning only. */
export const ONE_NEWS_TARGET_WORDS = { min: 500, max: 800 } as const;
export const ONE_NEWS_WORDS_PER_MINUTE = 220;

/** Minimum sourcing OneNews commits to. Independence is by publication+host. */
export const ONE_NEWS_MIN_SOURCES = 2;
export const ONE_NEWS_MIN_INDEPENDENT_SOURCES = 2;
/** Contested stories should normally carry a third source. Warning, not error. */
export const ONE_NEWS_CONTESTED_SOURCE_TARGET = 3;

export interface OneNewsContentInput {
  readingLanguage: string;
  subject: string;
  previewText?: string | null;
  headline: string;
  dek: string;
  whatHappened: string;
  whyItMatters: string;
  /** Optional by design. Absent is valid and common. */
  whatsContested?: string | null;
  whatToWatch: string;
  developing?: boolean;
  asOf?: Date | null;
  adminNotes?: string | null;
}

export interface OneNewsSourceInput {
  url: string;
  title: string;
  publication: string;
  sourceType: string;
  publishedAt?: Date | null;
  accessedAt?: Date | null;
  note?: string | null;
  sortOrder?: number;
}

export interface OneNewsValidationIssue {
  code: string;
  field: string;
  message: string;
  /** Index into the sources array when the issue is about one source. */
  sourceIndex?: number;
}

export interface OneNewsValidationResult {
  /** True when nothing blocks READY. Warnings may still be present. */
  valid: boolean;
  errors: OneNewsValidationIssue[];
  warnings: OneNewsValidationIssue[];
  wordCount: number;
  readingMinutes: number;
  sourceCount: number;
  independentSourceCount: number;
  hasPrimarySource: boolean;
  hasContestedSection: boolean;
}

const MAX = {
  subject: 160,
  previewText: 240,
  headline: 200,
  dek: 400,
  sourceTitle: 300,
  sourcePublication: 160,
} as const;

/** A contested section shorter than this is a placeholder, not a section. */
const MIN_CONTESTED_CHARS = 40;

export function validateOneNewsIssue(
  issue: OneNewsContentInput,
  sources: readonly OneNewsSourceInput[] = [],
  now: Date = new Date(),
): OneNewsValidationResult {
  const errors: OneNewsValidationIssue[] = [];
  const warnings: OneNewsValidationIssue[] = [];

  if (!(SUMMARY_LANGUAGES as readonly string[]).includes(issue.readingLanguage)) {
    errors.push({
      code: "invalid_reading_language",
      field: "readingLanguage",
      message: "Choose one of the supported reading languages.",
    });
  }

  requireText(errors, issue.subject, "subject", "subject_required", "The email subject is empty.");
  requireText(errors, issue.headline, "headline", "headline_required", "The headline is empty.");
  requireText(errors, issue.dek, "dek", "dek_required", "The dek is empty.");
  requireText(
    errors,
    issue.whatHappened,
    "whatHappened",
    "what_happened_required",
    "What happened is empty.",
  );
  requireText(
    errors,
    issue.whyItMatters,
    "whyItMatters",
    "why_it_matters_required",
    "Why it matters is empty.",
  );
  requireText(
    errors,
    issue.whatToWatch,
    "whatToWatch",
    "what_to_watch_required",
    "What to watch is empty.",
  );

  limit(errors, issue.subject, "subject", MAX.subject, "subject_too_long");
  limit(errors, issue.previewText, "previewText", MAX.previewText, "preview_text_too_long");
  limit(errors, issue.headline, "headline", MAX.headline, "headline_too_long");
  limit(errors, issue.dek, "dek", MAX.dek, "dek_too_long");

  // "What's contested" is optional. An absent section is never an error; a
  // section that exists but says nothing is, because it promises the reader a
  // disagreement and then does not name one.
  const contested = issue.whatsContested?.trim() ?? "";
  const hasContestedSection = contested.length > 0;
  if (hasContestedSection && contested.length < MIN_CONTESTED_CHARS) {
    errors.push({
      code: "whats_contested_too_short",
      field: "whatsContested",
      message:
        "What's contested is present but empty of substance. Say what is actually disputed, or leave the section out.",
    });
  }

  if (issue.developing && !issue.asOf) {
    errors.push({
      code: "developing_requires_as_of",
      field: "asOf",
      message: "A developing story needs an exact as-of timestamp.",
    });
  }
  if (issue.asOf && Number.isNaN(issue.asOf.getTime())) {
    errors.push({ code: "invalid_as_of", field: "asOf", message: "The as-of timestamp is invalid." });
  } else if (issue.asOf && issue.asOf.getTime() > now.getTime()) {
    errors.push({
      code: "as_of_in_future",
      field: "asOf",
      message: "As-of records when the facts were last checked. It cannot be in the future.",
    });
  }

  const sourceStats = analyzeSources(sources, errors);

  if (sourceStats.total < ONE_NEWS_MIN_SOURCES) {
    errors.push({
      code: "insufficient_sources",
      field: "sources",
      message: `OneNews needs at least ${ONE_NEWS_MIN_SOURCES} sources.`,
    });
  } else if (sourceStats.independent < ONE_NEWS_MIN_INDEPENDENT_SOURCES) {
    errors.push({
      code: "insufficient_independent_sources",
      field: "sources",
      message:
        "The sources trace back to a single publication. Add a source that is genuinely independent of the others.",
    });
  }

  if (sourceStats.total > 0 && !sourceStats.hasPrimary) {
    warnings.push({
      code: "no_primary_source",
      field: "sources",
      message:
        "No primary source is cited. Link the ruling, filing, statistics release, transcript or statement if one exists.",
    });
  }
  if (hasContestedSection && sourceStats.total < ONE_NEWS_CONTESTED_SOURCE_TARGET) {
    warnings.push({
      code: "contested_story_undersourced",
      field: "sources",
      message: `A story with a contested section normally carries at least ${ONE_NEWS_CONTESTED_SOURCE_TARGET} sources.`,
    });
  }
  if (sourceStats.total >= ONE_NEWS_MIN_SOURCES && sourceStats.independent === ONE_NEWS_MIN_INDEPENDENT_SOURCES) {
    warnings.push({
      code: "few_independent_sources",
      field: "sources",
      message: "Only two independent voices are cited. A third would make the reporting harder to dispute.",
    });
  }
  sources.forEach((source, index) => {
    if (!source.publishedAt || !source.accessedAt) {
      warnings.push({
        code: "source_metadata_incomplete",
        field: "sources",
        sourceIndex: index,
        message: "Publication and access dates are missing. Readers use them to date the evidence.",
      });
    }
  });

  if (issue.developing && issue.asOf) {
    const ageHours = (now.getTime() - issue.asOf.getTime()) / (60 * 60 * 1000);
    if (ageHours > 48) {
      warnings.push({
        code: "as_of_stale",
        field: "asOf",
        message: "The as-of timestamp is more than two days old. Re-check the facts or update it deliberately.",
      });
    }
  }

  const wordCount = countWords(
    [issue.whatHappened, issue.whyItMatters, contested, issue.whatToWatch].join(" "),
  );
  if (wordCount > 0 && wordCount < ONE_NEWS_TARGET_WORDS.min) {
    warnings.push({
      code: "below_target_length",
      field: "body",
      message: `About ${wordCount} words. OneNews usually runs ${ONE_NEWS_TARGET_WORDS.min}–${ONE_NEWS_TARGET_WORDS.max}. Publish it short rather than padding it.`,
    });
  }
  if (wordCount > ONE_NEWS_TARGET_WORDS.max) {
    warnings.push({
      code: "above_target_length",
      field: "body",
      message: `About ${wordCount} words. OneNews usually runs ${ONE_NEWS_TARGET_WORDS.min}–${ONE_NEWS_TARGET_WORDS.max}.`,
    });
  }
  if (sentenceCount(issue.dek) > 2) {
    warnings.push({
      code: "dek_multi_sentence",
      field: "dek",
      message: "The dek is meant to be one sentence naming what changed and why it matters.",
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    wordCount,
    readingMinutes: Math.max(1, Math.ceil(wordCount / ONE_NEWS_WORDS_PER_MINUTE)),
    sourceCount: sourceStats.total,
    independentSourceCount: sourceStats.independent,
    hasPrimarySource: sourceStats.hasPrimary,
    hasContestedSection,
  };
}

/** The one question the lifecycle asks of validation. */
export function canMarkOneNewsReady(result: OneNewsValidationResult): boolean {
  return result.valid;
}

export function countWords(value: string): number {
  const text = value.trim();
  return text ? text.split(/\s+/u).length : 0;
}

export function isOneNewsSourceType(value: string): value is OneNewsSourceType {
  return (ONE_NEWS_SOURCE_TYPES as readonly string[]).includes(value);
}

function analyzeSources(
  sources: readonly OneNewsSourceInput[],
  errors: OneNewsValidationIssue[],
): { total: number; independent: number; hasPrimary: boolean } {
  const publications = new Set<string>();
  const hosts = new Set<string>();
  let hasPrimary = false;

  sources.forEach((source, index) => {
    if (!isSafeHttpUrl(source.url)) {
      errors.push({
        code: "unsafe_source_url",
        field: "sources",
        sourceIndex: index,
        message: "Source links must be ordinary http(s) URLs.",
      });
    }
    if (!source.title?.trim()) {
      errors.push({
        code: "source_title_required",
        field: "sources",
        sourceIndex: index,
        message: "Every source needs a title.",
      });
    }
    if (!source.publication?.trim()) {
      errors.push({
        code: "source_publication_required",
        field: "sources",
        sourceIndex: index,
        message: "Every source needs a publication.",
      });
    }
    limit(errors, source.title, "sources", MAX.sourceTitle, "source_title_too_long", index);
    limit(
      errors,
      source.publication,
      "sources",
      MAX.sourcePublication,
      "source_publication_too_long",
      index,
    );
    if (!isOneNewsSourceType(source.sourceType)) {
      errors.push({
        code: "invalid_source_type",
        field: "sources",
        sourceIndex: index,
        message: "Unknown source type.",
      });
    }
    if (source.sourceType === "PRIMARY") hasPrimary = true;

    const publication = source.publication?.trim().toLowerCase();
    if (publication) publications.add(publication);
    const host = sourceHostLabel(source.url);
    if (host) hosts.add(host);
  });

  // Two sources count as one voice if they share either a publication name or
  // a host, so independence is the stricter of the two counts.
  const independent = sources.length === 0 ? 0 : Math.min(publications.size, hosts.size);
  return { total: sources.length, independent, hasPrimary };
}

function requireText(
  errors: OneNewsValidationIssue[],
  value: string | null | undefined,
  field: string,
  code: string,
  message: string,
): void {
  if (!value?.trim()) errors.push({ code, field, message });
}

function limit(
  errors: OneNewsValidationIssue[],
  value: string | null | undefined,
  field: string,
  max: number,
  code: string,
  sourceIndex?: number,
): void {
  if ((value ?? "").trim().length > max) {
    errors.push({
      code,
      field,
      ...(sourceIndex === undefined ? {} : { sourceIndex }),
      message: `Keep this under ${max} characters.`,
    });
  }
}

function sentenceCount(value: string): number {
  const text = value.trim();
  if (!text) return 0;
  return text.split(/[.!?]+(?:\s|$)/u).filter((part) => part.trim().length > 0).length;
}

/**
 * Codes that block saving a draft at all. Everything else — a missing section,
 * too few sources — is expected while an editor is still working, and only
 * blocks READY.
 */
export const ONE_NEWS_DRAFT_BLOCKING_CODES = new Set([
  "invalid_reading_language",
  "subject_too_long",
  "preview_text_too_long",
  "headline_too_long",
  "dek_too_long",
  "invalid_as_of",
  "as_of_in_future",
  "unsafe_source_url",
  "invalid_source_type",
  "source_title_too_long",
  "source_publication_too_long",
]);

/** Validation applied on every draft save. */
export function validateOneNewsDraft(
  issue: OneNewsContentInput,
  sources: readonly OneNewsSourceInput[] = [],
  now: Date = new Date(),
): OneNewsValidationResult {
  const full = validateOneNewsIssue(issue, sources, now);
  const errors = full.errors.filter((issueFound) =>
    ONE_NEWS_DRAFT_BLOCKING_CODES.has(issueFound.code),
  );
  return { ...full, valid: errors.length === 0, errors };
}
