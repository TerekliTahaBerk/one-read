/**
 * One Read — editorial thresholds + tunables.
 *
 * Centralized so we can tune the editorial bar without grepping.
 * Production defaults are intentionally strict: we'd rather skip a day
 * than send a mediocre article.
 */

const num = (envValue: string | undefined, fallback: number): number => {
  if (envValue === undefined) return fallback;
  const parsed = Number(envValue);
  return Number.isFinite(parsed) ? parsed : fallback;
};

/** Minimum composite article rank to qualify as a TopicDailyPick. */
export const MIN_ARTICLE_SCORE = num(process.env.MIN_ARTICLE_SCORE, 0.7);

/** Minimum personalized score required to actually send an email. */
export const MIN_DELIVERY_SCORE = num(process.env.MIN_DELIVERY_SCORE, 0.6);

/** LLM-reported summary confidence (0..100) required to mark READY. */
export const MIN_SUMMARY_CONFIDENCE = num(
  process.env.MIN_SUMMARY_CONFIDENCE,
  75,
);

/** Extraction confidence below this drops the article to RSS-only mode. */
export const MIN_EXTRACTION_CONFIDENCE = num(
  process.env.MIN_EXTRACTION_CONFIDENCE,
  0.45,
);

/** Cleaned-text minimum char length to be considered "extracted". */
export const MIN_CLEANED_TEXT_LENGTH = 600;

/** Maximum cleaned-text we keep in DB (~120k chars). */
export const MAX_CLEANED_TEXT_LENGTH = 120_000;

/** Per-source throttle: how many candidates to keep per RSS run. */
export const PER_SOURCE_CANDIDATE_LIMIT = num(
  process.env.PER_SOURCE_CANDIDATE_LIMIT,
  6,
);
