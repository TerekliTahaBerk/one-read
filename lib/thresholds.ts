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

/* ----------------------------------------------------------------------- */
/* Development-only DEMO thresholds                                         */
/* ----------------------------------------------------------------------- */

/**
 * Relaxed thresholds used ONLY to preview the full One Read experience with
 * demo/manual articles before real LLM keys exist. These are never used in
 * production — `getEffectiveThresholds()` refuses to apply them when
 * NODE_ENV === "production". Production constants above are untouched.
 */
export const DEMO_MIN_ARTICLE_SCORE = num(
  process.env.DEMO_MIN_ARTICLE_SCORE,
  0.45,
);
export const DEMO_MIN_DELIVERY_SCORE = num(
  process.env.DEMO_MIN_DELIVERY_SCORE,
  0.35,
);
export const DEMO_MIN_SUMMARY_CONFIDENCE = num(
  process.env.DEMO_MIN_SUMMARY_CONFIDENCE,
  50,
);

export interface EffectiveThresholds {
  minArticleScore: number;
  minDeliveryScore: number;
  minSummaryConfidence: number;
  /** True only when demo thresholds are actually in effect. */
  demo: boolean;
}

/**
 * Is demo mode active? Demo mode is a development convenience and is HARD
 * DISABLED in production regardless of env or flags.
 *
 * @param explicit pass `true` for a `--demo` CLI flag / API request; leave
 *   undefined to fall back to the `DEMO_MODE` env var.
 */
export function isDemoModeEnabled(explicit?: boolean): boolean {
  if (process.env.NODE_ENV === "production") return false;
  if (explicit !== undefined) return explicit;
  return process.env.DEMO_MODE === "true";
}

/**
 * The thresholds the pipeline should actually use. Returns the relaxed demo
 * set only when demo mode is enabled AND we're not in production; otherwise
 * the strict production constants.
 */
export function getEffectiveThresholds(explicitDemo?: boolean): EffectiveThresholds {
  if (isDemoModeEnabled(explicitDemo)) {
    return {
      minArticleScore: DEMO_MIN_ARTICLE_SCORE,
      minDeliveryScore: DEMO_MIN_DELIVERY_SCORE,
      minSummaryConfidence: DEMO_MIN_SUMMARY_CONFIDENCE,
      demo: true,
    };
  }
  return {
    minArticleScore: MIN_ARTICLE_SCORE,
    minDeliveryScore: MIN_DELIVERY_SCORE,
    minSummaryConfidence: MIN_SUMMARY_CONFIDENCE,
    demo: false,
  };
}
