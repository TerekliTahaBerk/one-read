/**
 * One Read — shared LLM prompt scaffolding.
 *
 * These prompts are intentionally strict: the system message always
 * tells the model to return JSON only, no prose, no markdown fences.
 * The user message includes a hard schema example so the model knows
 * exactly what shape to produce.
 *
 * Keep the prompts tight — every token counts both for cost and for
 * model-following accuracy.
 */

import type { ScoreRequest, SummarizeRequest } from "./types";
import { ALL_TOPIC_SLUGS, topicBySlug } from "../topics";

const TOPIC_LIST = ALL_TOPIC_SLUGS.join(", ");

/* ----------------------------------------------------------------------- */
/* Summary prompts                                                         */
/* ----------------------------------------------------------------------- */

export const SUMMARY_SYSTEM_PROMPT = `You are the senior editor of "One Read", a calm morning newsletter that sends ONE curated article per subscriber per day. Your job is to write a faithful, useful, beautiful summary.

Hard rules:
- Return ONE JSON object, no prose, no markdown, no fences.
- Be faithful to the source. Never invent facts, names, numbers, quotes.
- Keep an editorial, calm, slightly literary tone. No hype, no clickbait, no emojis.
- threeSentenceSummary MUST be exactly 3 sentences.
- keyTakeaways MUST be exactly 5 strings, each a short sentence (8-22 words).
- bestFor MUST be exactly 3 short reader personas (e.g. "Engineers shipping LLM features").
- All summary fields must be in the requested target language.
- This is a SUMMARY, never a full translation: distill, don't translate the article. Never copy long passages verbatim — paraphrase in your own words.
- Banned openings/filler: do NOT start sentences with "In this article", "This piece", "This post", "The author argues/explains", "Bu yazıda", "Bu makale". Get straight to the substance.
- No generic AI/marketing language: avoid "In today's fast-paced world", "It's important to note", "Moreover/Furthermore" padding, "delve", "leverage" as filler, and empty hype.
- English tone: calm, sharp, editorial, premium — like a thoughtful human editor, not a chatbot.
- Turkish tone: natural, fluent, editorial Turkish — NOT a literal/robotic word-for-word translation. Established technical terms may stay in English when that is how professionals actually write them.
- Translations preserve meaning and nuance, not literal word order.
- If the article does not have enough substance for a meaningful summary, set confidence below 60 and explain in editorNotes — do not invent content.
- Never insert calls to action, signatures, or sign-offs.`;

export function buildSummaryUserPrompt(req: SummarizeRequest): string {
  const topic = topicBySlug(req.primaryTopic);
  const topicLabel = topic?.label ?? req.primaryTopic;

  const body =
    req.cleanedText && req.cleanedText.length > 0
      ? truncate(req.cleanedText, 18_000)
      : truncate(req.rawExcerpt ?? "", 4_000);

  return `Article metadata:
- title: ${jsonString(req.title)}
- sourceName: ${jsonString(req.sourceName)}
- url: ${jsonString(req.url)}
- sourceLanguage: ${jsonString(req.sourceLanguage)}
- targetLanguage: ${jsonString(req.targetLanguage)}
- framingTopic: ${jsonString(topicLabel)}
- difficulty: ${jsonString(req.difficulty)}

Article body (clean text):
"""
${body}
"""

Return JSON with EXACTLY this shape (all keys required):
{
  "subject": string,
  "preheader": string,
  "displayTitle": string,
  "originalTitle": string,
  "sourceName": string,
  "summaryLanguage": string,
  "readingTime": string,
  "oneLineHook": string,
  "whyThisArticle": string,
  "threeSentenceSummary": [string, string, string],
  "keyTakeaways": [string, string, string, string, string],
  "bestFor": [string, string, string],
  "oneThingToRemember": string,
  "originalUrl": string,
  "confidence": number,
  "editorNotes": string
}

Constraints:
- summaryLanguage MUST equal ${jsonString(req.targetLanguage)}.
- originalTitle MUST equal ${jsonString(req.title)}.
- originalUrl MUST equal ${jsonString(req.url)}.
- confidence is an integer 0..100. Be honest — extraction quality matters.
- Frame the summary so a subscriber whose primary interest is "${topicLabel}" sees why it's relevant.`;
}

/* ----------------------------------------------------------------------- */
/* Scoring prompts                                                         */
/* ----------------------------------------------------------------------- */

export const SCORE_SYSTEM_PROMPT = `You are the editorial scoring engine for "One Read", a calm morning newsletter. You classify and score candidate articles.

Hard rules:
- Return ONE JSON object, no prose, no markdown, no fences.
- Topic slug MUST be one of the provided canonical slugs.
- Reject promotional / shallow / SEO-spun / link-list / paywall-stub content (set rejectionReason and keep scores low).
- Reject articles whose substance can't be inferred from the provided text.
- Be a strict editor. Most articles are NOT good enough for a curated daily.`;

export function buildScoreUserPrompt(req: ScoreRequest): string {
  const body =
    req.cleanedText && req.cleanedText.length > 0
      ? truncate(req.cleanedText, 12_000)
      : truncate(req.rawExcerpt ?? "", 3_000);

  return `Canonical topic slugs (pick the best fit):
${TOPIC_LIST}

Hinted topic from the source feed: ${jsonString(req.hintedTopic)}
Hinted subtopics: ${JSON.stringify(req.hintedSubtopics)}

Article metadata:
- title: ${jsonString(req.title)}
- sourceName: ${jsonString(req.sourceName)}
- url: ${jsonString(req.url)}
- sourceLanguage: ${jsonString(req.sourceLanguage)}

Article body (clean text):
"""
${body}
"""

Return JSON with EXACTLY this shape:
{
  "topic": string,             // one of the canonical slugs above
  "subtopics": string[],       // 0..6 subtopic slugs
  "detectedInterests": string[], // top-level interest slugs this serves
  "difficulty": string,        // "beginner" | "intermediate" | "advanced" | "mixed"
  "qualityScore": number,      // 0..1
  "originalityScore": number,  // 0..1
  "usefulnessScore": number,   // 0..1
  "readabilityScore": number,  // 0..1
  "morningReadScore": number,  // 0..1 — fit for a calm morning read
  "rejectionReason": string | null,
  "selectionReason": string    // one editorial sentence
}

If the content is shallow, promotional, paywalled, or off-mission for a curated daily newsletter, set rejectionReason to a short reason and keep all scores below 0.5.`;
}

/* ----------------------------------------------------------------------- */
/* Helpers                                                                 */
/* ----------------------------------------------------------------------- */

function truncate(s: string, max: number): string {
  if (!s) return "";
  return s.length <= max ? s : `${s.slice(0, max)}\n\n[...truncated]`;
}

function jsonString(s: string): string {
  return JSON.stringify(s ?? "");
}
