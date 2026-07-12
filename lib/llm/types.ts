/**
 * OneRead — LLM provider contract.
 *
 * Both OpenAI and Anthropic implementations conform to `LlmProvider`.
 * Outputs are strict JSON schemas — the providers parse + validate the
 * model's response and either return a typed object or throw.
 *
 * The pipeline never trusts the model: every numeric is clamped, every
 * required field has a default, and confidence < threshold rejects.
 */

import type { TopicSlug } from "../topics";
import type { AiErrorKind } from "../ai/types";

/** A provider outage/throttle that must not be mistaken for an editorial
 * rejection. The scorer keeps the article pending and retries next run. */
export class LlmRetryableError extends Error {
  constructor(
    message: string,
    public readonly kind: AiErrorKind,
  ) {
    super(message);
    this.name = "LlmRetryableError";
  }
}

/* ----------------------------------------------------------------------- */
/* Summary schema                                                          */
/* ----------------------------------------------------------------------- */

export interface StructuredSummary {
  /** Email subject — short, editorial, no clickbait. */
  subject: string;
  /** ~80-char preheader shown after the subject. */
  preheader: string;
  /** Display title in summaryLanguage (may be a translation). */
  displayTitle: string;
  /** Original article title (untranslated, for attribution). */
  originalTitle: string;
  /** Publisher name (e.g. "Stripe Blog"). */
  sourceName: string;
  /** "English" | "Turkish" — language of all summary fields below. */
  summaryLanguage: string;
  /** Estimated full-article reading time, e.g. "6 min". */
  readingTime: string;
  /** Single short hook (~12 words). */
  oneLineHook: string;
  /** Why a OneRead subscriber would care about this — 1-2 sentences. */
  whyThisArticle: string;
  /** EXACTLY 3 sentences. Faithful to the article — no invention. */
  threeSentenceSummary: [string, string, string];
  /** EXACTLY 5 takeaways. Concrete + scannable. */
  keyTakeaways: [string, string, string, string, string];
  /** EXACTLY 3 personas this is "best for". */
  bestFor: [string, string, string];
  /** Single most-important sentence to remember. */
  oneThingToRemember: string;
  /** Original article URL — passed back unchanged. */
  originalUrl: string;
  /** LLM self-reported confidence in [0, 100]. */
  confidence: number;
  /** Free-form internal notes (only shown in admin). */
  editorNotes: string;
}

export interface SummarizeRequest {
  /** Article title (original). */
  title: string;
  /** Source/publisher display name. */
  sourceName: string;
  /** Original URL. */
  url: string;
  /** Original article language ("English" | "Turkish" | …). */
  sourceLanguage: string;
  /** Target language for summary fields. */
  targetLanguage: string;
  /** Topic slug we want to frame the summary around. */
  primaryTopic: string;
  /** "beginner" | "intermediate" | "advanced" | "mixed" */
  difficulty: string;
  /** Cleaned full-text from extractor, or null if extraction failed. */
  cleanedText: string | null;
  /** Original RSS excerpt — always provided as a fallback. */
  rawExcerpt: string | null;
}

/* ----------------------------------------------------------------------- */
/* Scoring schema                                                          */
/* ----------------------------------------------------------------------- */

export interface StructuredScore {
  /** Best top-level topic slug — must be from the canonical taxonomy. */
  topic: TopicSlug;
  /** 0..N subtopic slugs — may be from any topic in the taxonomy. */
  subtopics: string[];
  /** Slugs of any user-facing interests this article would satisfy. */
  detectedInterests: TopicSlug[];
  /** "beginner" | "intermediate" | "advanced" | "mixed" */
  difficulty: string;
  /** 0..1 — overall editorial quality. */
  qualityScore: number;
  /** 0..1 — how original / non-derivative. */
  originalityScore: number;
  /** 0..1 — how directly useful to a working professional. */
  usefulnessScore: number;
  /** 0..1 — how readable for a 5-minute morning read. */
  readabilityScore: number;
  /** 0..1 — fit for a calm morning read (no rage-bait, no breaking news). */
  morningReadScore: number;
  /** Non-empty when the article should NOT be considered. */
  rejectionReason: string | null;
  /** One-sentence editorial reason for selection. */
  selectionReason: string;
}

export interface ScoreRequest {
  title: string;
  sourceName: string;
  url: string;
  sourceLanguage: string;
  cleanedText: string | null;
  rawExcerpt: string | null;
  /** RSS-suggested topic + subtopics, for grounding. */
  hintedTopic: string;
  hintedSubtopics: readonly string[];
}

/* ----------------------------------------------------------------------- */
/* Provider interface                                                      */
/* ----------------------------------------------------------------------- */

export interface LlmProvider {
  /** Stable identifier, e.g. "openai/gpt-4o-mini". Stored in Summary.generator. */
  id: string;
  summarize(req: SummarizeRequest): Promise<StructuredSummary | null>;
  score(req: ScoreRequest): Promise<StructuredScore | null>;
}
