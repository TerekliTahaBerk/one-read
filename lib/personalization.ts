/**
 * One Read — personalized scoring engine.
 *
 * Pure functions. No DB access here, so this module is fully testable and
 * can be reused by the daily pipeline, the admin preview, and any future
 * what-if simulations.
 *
 * The final personalizedScore is a weighted sum (weights sum to 1.0):
 *
 *   0.28 * topicInterestMatch
 * + 0.17 * articleQualityScore
 * + 0.13 * usefulnessScore
 * + 0.09 * noveltyScore
 * + 0.10 * feedbackAffinityScore
 * + 0.18 * languageMatchScore
 * + 0.05 * morningReadScore
 *
 * languageMatch carries real weight (0.18) now that we curate native-language
 * feeds: a subscriber who asks for French articles should actually get French
 * ones when they exist, while topicInterest (0.28) still dominates so we never
 * sacrifice relevance for language.
 *
 * Every component is normalized to [0, 1].
 */

import type { TopicSlug } from "./topics";

/* ----------------------------------------------------------------------- */
/* Inputs                                                                  */
/* ----------------------------------------------------------------------- */

export interface SubscriberContext {
  primaryInterest: TopicSlug | null;
  secondaryInterests: readonly TopicSlug[];
  /** Preferred source language name, "Any", or null (no preference). */
  sourceLanguage: string | null;
  /** Last N topic slugs sent, *most recent first*. */
  recentlySentTopics: readonly TopicSlug[];
  /** topicAffinity[slug] in [-1, 1]. Optional. */
  feedbackProfile?: FeedbackProfile | null;
}

export interface FeedbackProfile {
  topicAffinity?: Record<string, number>;
  sourceAffinity?: Record<string, number>;
  /** ISO string of last update — informational. */
  updatedAt?: string;
}

export interface PickCandidate {
  topic: TopicSlug;
  subtopics: readonly string[];
  sourceLanguage: string;
  sourceName: string;
  qualityScore: number;
  usefulnessScore: number;
  morningReadScore: number;
}

export interface ScoreBreakdown {
  topicInterestMatch: number;
  articleQuality: number;
  usefulness: number;
  novelty: number;
  feedbackAffinity: number;
  languageMatch: number;
  morningRead: number;
  /** Final weighted total. */
  total: number;
}

/* ----------------------------------------------------------------------- */
/* Quality thresholds                                                      */
/* ----------------------------------------------------------------------- */

// The actual numeric thresholds live in `lib/thresholds.ts` so they can be
// tuned via env. We re-export them here for callers who already import
// from this module — keeps the API stable for existing code.
export {
  MIN_ARTICLE_SCORE as MIN_TOPIC_PICK_QUALITY,
  MIN_DELIVERY_SCORE,
} from "./thresholds";

/** Weights — exposed for the admin preview. */
export const WEIGHTS = Object.freeze({
  topicInterestMatch: 0.28,
  articleQuality: 0.17,
  usefulness: 0.13,
  novelty: 0.09,
  feedbackAffinity: 0.1,
  languageMatch: 0.18,
  morningRead: 0.05,
});

/* ----------------------------------------------------------------------- */
/* Component scorers                                                       */
/* ----------------------------------------------------------------------- */

/**
 * How strongly this pick matches the user's selected interests.
 * - Primary interest match  → 1.00
 * - Secondary interest      → 0.85
 * - Subtopic-level overlap  → 0.60
 * - Otherwise               → 0.00
 */
export function topicInterestMatch(
  pick: PickCandidate,
  ctx: SubscriberContext,
): number {
  if (ctx.primaryInterest && pick.topic === ctx.primaryInterest) return 1.0;
  if (ctx.secondaryInterests.includes(pick.topic)) return 0.85;

  // Subtopic crossover: do any of the user's interest slugs appear in
  // the pick's subtopics? (Helps surface adjacent picks like AI for a
  // user who selected only Software Engineering.)
  const userInterestSet = new Set([
    ...(ctx.primaryInterest ? [ctx.primaryInterest] : []),
    ...ctx.secondaryInterests,
  ]);
  for (const sub of pick.subtopics) {
    if (userInterestSet.has(sub)) return 0.6;
  }
  return 0;
}

/**
 * Novelty: avoid repeating the same topic.
 * - Topic absent from history       → 1.0
 * - Sent yesterday (index 0)        → 0.0
 * - Sent 2-3 days ago (index 1-2)   → 0.3
 * - Sent further back (index 3+)    → 0.7
 *
 * Plus a "dominance" penalty: if the most recent 3 sends are all this topic,
 * multiply by 0.2 — unless it's the user's only interest.
 */
export function noveltyScore(
  topic: TopicSlug,
  ctx: SubscriberContext,
): number {
  const recent = ctx.recentlySentTopics;
  const index = recent.indexOf(topic);

  let base: number;
  if (recent.length === 0 || index === -1) base = 1.0;
  else if (index === 0) base = 0.0;
  else if (index <= 2) base = 0.3;
  else base = 0.7;

  // Dominance penalty: 3 days of the same topic in a row.
  const last3 = recent.slice(0, 3);
  const dominated =
    last3.length === 3 && last3.every((t) => t === topic);
  const onlyInterest =
    ctx.primaryInterest === topic &&
    ctx.secondaryInterests.length === 0;

  if (dominated && !onlyInterest) base *= 0.2;

  return clamp01(base);
}

/**
 * Feedback affinity for this topic + source. Default 0.5 (neutral).
 * The profile stores values in [-1, 1]; we map to [0, 1].
 */
export function feedbackAffinityScore(
  pick: PickCandidate,
  ctx: SubscriberContext,
): number {
  const profile = ctx.feedbackProfile;
  if (!profile) return 0.5;

  const topicAff = profile.topicAffinity?.[pick.topic];
  const sourceAff = profile.sourceAffinity?.[pick.sourceName];

  // Average whichever signals exist, default 0.
  const signals: number[] = [];
  if (typeof topicAff === "number") signals.push(topicAff);
  if (typeof sourceAff === "number") signals.push(sourceAff);
  if (signals.length === 0) return 0.5;

  const avg = signals.reduce((a, b) => a + b, 0) / signals.length;
  // Map [-1, 1] → [0, 1].
  return clamp01((avg + 1) / 2);
}

/**
 * Language match.
 * - sourceLanguage is "Any"        → 1.0
 * - exact match                    → 1.0
 * - "Any" pick + concrete user pref → 0.6 (flexible, but a real nudge)
 * - mismatch                       → 0.25
 *
 * The mismatch floor is intentionally low (combined with the 0.18 weight) so
 * that, among similarly relevant articles, a native-language one clearly wins.
 */
export function languageMatchScore(
  pick: PickCandidate,
  ctx: SubscriberContext,
): number {
  const userLang = ctx.sourceLanguage;
  if (!userLang || userLang === "Any") return 1.0;
  if (pick.sourceLanguage === userLang) return 1.0;
  if (pick.sourceLanguage === "Any") return 0.6;
  return 0.25;
}

/* ----------------------------------------------------------------------- */
/* Composite                                                               */
/* ----------------------------------------------------------------------- */

export function scorePick(
  pick: PickCandidate,
  ctx: SubscriberContext,
): ScoreBreakdown {
  const topicInterest = topicInterestMatch(pick, ctx);
  const quality = clamp01(pick.qualityScore);
  const usefulness = clamp01(pick.usefulnessScore);
  const novelty = noveltyScore(pick.topic, ctx);
  const feedback = feedbackAffinityScore(pick, ctx);
  const language = languageMatchScore(pick, ctx);
  const morning = clamp01(pick.morningReadScore);

  const total =
    WEIGHTS.topicInterestMatch * topicInterest +
    WEIGHTS.articleQuality * quality +
    WEIGHTS.usefulness * usefulness +
    WEIGHTS.novelty * novelty +
    WEIGHTS.feedbackAffinity * feedback +
    WEIGHTS.languageMatch * language +
    WEIGHTS.morningRead * morning;

  return {
    topicInterestMatch: round3(topicInterest),
    articleQuality: round3(quality),
    usefulness: round3(usefulness),
    novelty: round3(novelty),
    feedbackAffinity: round3(feedback),
    languageMatch: round3(language),
    morningRead: round3(morning),
    total: round3(total),
  };
}

/**
 * Determine the matched topic slug for a given subscriber + pick.
 * Used to render the "Picked for your interest in X." line and to
 * record `DailySend.matchedTopic`.
 */
export function matchedTopicFor(
  pick: PickCandidate,
  ctx: SubscriberContext,
): TopicSlug {
  if (ctx.primaryInterest === pick.topic) return ctx.primaryInterest;
  if (ctx.secondaryInterests.includes(pick.topic)) return pick.topic;
  // Subtopic crossover or fallback: still report the pick's own topic.
  return pick.topic;
}

/* ----------------------------------------------------------------------- */
/* Helpers                                                                 */
/* ----------------------------------------------------------------------- */

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
