/**
 * One Read — article extraction + scoring stage.
 *
 * For each newly-ingested article whose `scoringStatus = "PENDING"`:
 *   1. Best-effort extract the cleaned body via readability.
 *   2. Score via the configured LLM provider (or heuristic fallback).
 *   3. Persist scores, cleaned text, and scoringStatus.
 *
 * This stage is idempotent — running it twice is a no-op for already-
 * scored articles. Rejected articles are kept (for observability) but
 * never enter the pick stage.
 */

import { prisma } from "./prisma";
import { extractArticle } from "./extract";
import { getLlmProvider } from "./llm";
import {
  MAX_CLEANED_TEXT_LENGTH,
  MIN_CLEANED_TEXT_LENGTH,
  MIN_EXTRACTION_CONFIDENCE,
} from "./thresholds";
import { ALL_TOPIC_SLUGS } from "./topics";
import type { Article } from "@prisma/client";
import type { LlmProvider, StructuredScore } from "./llm";

export interface ScoreStageResult {
  total: number;
  scored: number;
  rejected: number;
  failed: number;
}

/**
 * Process every PENDING article. Returns counts for logging.
 */
export async function extractAndScorePendingArticles(opts: {
  llm?: LlmProvider | null;
  /** Cap on number of articles processed in a single run. */
  limit?: number;
} = {}): Promise<ScoreStageResult> {
  const llm = opts.llm === undefined ? getLlmProvider() : opts.llm;
  const limit = opts.limit ?? 60;
  const isProd = process.env.NODE_ENV === "production";

  // Heuristic scoring is a development convenience only. In production we
  // refuse to accept articles without a real LLM verdict — otherwise the
  // pipeline could promote low-confidence heuristic content to a daily
  // pick. This mirrors the summarizer's prod behavior.
  if (!llm && isProd) {
    console.error(
      "[scorer] No LLM provider configured in production. Pending articles will be REJECTED, not heuristically scored. Set AI_PROVIDER + API key.",
    );
  }

  const pending = await prisma.article.findMany({
    where: { scoringStatus: "PENDING" },
    orderBy: { ingestedAt: "asc" },
    take: limit,
  });

  let scored = 0;
  let rejected = 0;
  let failed = 0;

  for (const article of pending) {
    try {
      // 1. Extract.
      const extracted = await extractArticle(article.url);

      const cleanedText =
        extracted.cleanedText &&
        extracted.cleanedText.length >= MIN_CLEANED_TEXT_LENGTH
          ? extracted.cleanedText.slice(0, MAX_CLEANED_TEXT_LENGTH)
          : null;

      // 2. Score. Use the LLM when configured; otherwise fall back to the
      // heuristic scorer ONLY in development. In production a missing LLM
      // verdict is a hard reject (see the prod guard above).
      let score: StructuredScore | null;
      let nullReason: string;
      if (llm) {
        score = await llm.score({
          title: article.title,
          sourceName: article.sourceName,
          url: article.url,
          sourceLanguage: article.sourceLanguage,
          cleanedText,
          rawExcerpt: article.rawExcerpt,
          hintedTopic: article.topic,
          hintedSubtopics: article.subtopics,
        });
        if (!score) {
          console.error(
            `[scorer] LLM returned no valid score for "${article.url}" after retry — rejecting.`,
          );
        }
        nullReason = "LLM scoring failed (invalid JSON after retry)";
      } else if (isProd) {
        score = null;
        nullReason =
          "no LLM provider configured (heuristic scoring disabled in production)";
      } else {
        score = heuristicScore(article, cleanedText);
        nullReason = "scorer returned null";
      }

      if (!score) {
        await prisma.article.update({
          where: { id: article.id },
          data: {
            cleanedText,
            extractionConfidence: extracted.confidence,
            scoringStatus: "REJECTED",
            rejectionReason: extracted.reason ?? nullReason,
          },
        });
        rejected++;
        continue;
      }

      // 3. Persist.
      const willReject =
        !!score.rejectionReason ||
        extracted.confidence < MIN_EXTRACTION_CONFIDENCE;

      await prisma.article.update({
        where: { id: article.id },
        data: {
          cleanedText,
          extractionConfidence: extracted.confidence,
          topic: ALL_TOPIC_SLUGS.includes(score.topic)
            ? score.topic
            : article.topic,
          subtopics: score.subtopics.length > 0 ? score.subtopics : article.subtopics,
          detectedInterests: score.detectedInterests,
          difficulty: score.difficulty,
          qualityScore: score.qualityScore,
          originalityScore: score.originalityScore,
          usefulnessScore: score.usefulnessScore,
          readabilityScore: score.readabilityScore,
          morningReadScore: score.morningReadScore,
          reasonForSelection: score.selectionReason || null,
          scoringStatus: willReject ? "REJECTED" : "SCORED",
          rejectionReason: willReject
            ? score.rejectionReason ??
              `low extraction confidence (${extracted.confidence.toFixed(2)})`
            : null,
        },
      });

      if (willReject) rejected++;
      else scored++;
    } catch (err) {
      console.error(
        `[scorer] article "${article.url}" failed:`,
        err instanceof Error ? err.message : err,
      );
      try {
        await prisma.article.update({
          where: { id: article.id },
          data: {
            scoringStatus: "REJECTED",
            rejectionReason: err instanceof Error ? err.message : "unknown",
          },
        });
      } catch {
        /* best-effort */
      }
      failed++;
    }
  }

  return { total: pending.length, scored, rejected, failed };
}

/* ----------------------------------------------------------------------- */
/* Heuristic fallback scorer                                               */
/* ----------------------------------------------------------------------- */

/**
 * Conservative non-LLM scorer used when no AI provider is configured.
 * Rewards length + decent extraction; penalizes obvious promo/SEO patterns.
 */
function heuristicScore(
  article: Article,
  cleanedText: string | null,
): StructuredScore {
  const title = article.title.toLowerCase();
  const promoMarkers = [
    "buy now",
    "we're hiring",
    "we are hiring",
    "sponsored",
    "available now",
    "top 10",
  ];
  const isPromo = promoMarkers.some((m) => title.includes(m));

  if (isPromo) {
    return {
      topic: article.topic,
      subtopics: [...article.subtopics],
      detectedInterests: [],
      difficulty: "mixed",
      qualityScore: 0.2,
      originalityScore: 0.2,
      usefulnessScore: 0.2,
      readabilityScore: 0.4,
      morningReadScore: 0.2,
      rejectionReason: "promotional title",
      selectionReason: "",
    };
  }

  const lengthBoost = cleanedText
    ? Math.min(1, cleanedText.length / 5000)
    : 0.3;

  return {
    topic: article.topic,
    subtopics: [...article.subtopics],
    detectedInterests: [],
    difficulty: "mixed",
    qualityScore: 0.5 + 0.3 * lengthBoost,
    originalityScore: 0.5,
    usefulnessScore: 0.5 + 0.2 * lengthBoost,
    readabilityScore: 0.6,
    morningReadScore: 0.55,
    rejectionReason: null,
    selectionReason: "Heuristic accept (no LLM configured).",
  };
}
