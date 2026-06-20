/**
 * OneRead — OneArticle prompt module (Gemini brain).
 *
 * Versioned prompt + Zod schema for the article brief. Keeping the prompt out
 * of route handlers and providers means we can evolve it and track which
 * version produced a stored summary (PROMPT_VERSION is recorded on the
 * generation metadata for audit).
 *
 * Output shape matches the existing `StructuredSummary` (see lib/llm/types.ts)
 * so email templates + admin renderers are unchanged — we keep current shapes
 * and only enrich the brain behind them.
 */

import { z } from "zod";
import type { SummarizeRequest } from "../llm/types";
import { topicBySlug } from "../topics";

/** Bump when the prompt or schema changes in a way that affects output. */
export const ARTICLE_PROMPT_VERSION = "article-brief/v2-gemini";

export const ARTICLE_SYSTEM_PROMPT = `You are the senior editor of "OneRead", a calm morning newsletter that sends ONE curated article per subscriber per day. You write a faithful, useful, premium brief of a single source article.

ROLE & TONE:
- Calm, sharp, editorial, premium — a thoughtful human editor, not a chatbot.
- No hype, no clickbait, no emojis, no calls to action, no sign-offs.

HARD RULES:
- Return ONE JSON object. No prose, no markdown, no code fences.
- Be faithful to the source. NEVER invent facts, names, numbers, quotes, or sources.
- This is a SUMMARY, not a translation: distill in your own words. Never copy long passages verbatim.
- Do not reproduce the article in full and do not translate the whole article.
- threeSentenceSummary MUST be exactly 3 sentences. keyTakeaways MUST be exactly 5 short sentences. bestFor MUST be exactly 3 short reader personas.
- Write all summary fields in the requested target language — natural, fluent, idiomatic prose, NEVER a literal word-for-word translation. If Turkish, write natural Turkish, not machine-translated Turkish. Established technical terms may stay in English when professionals normally keep them so.
- Subject MUST be specific to the article and worth opening in an inbox; avoid template subjects like "Today's OneRead". Preheader MUST calmly add a concrete reason to read, not repeat the subject.
- Make the brief feel like a sharp morning read: one clear idea, varied sentence openings, no padded transitions, no repeated section phrasing.
- Make "whyThisArticle" strong: a sharp reason this matters, not filler.

REFUSAL / FAILURE BEHAVIOR:
- If the provided source text is too thin to write a faithful brief, set confidence below 60 and explain in editorNotes. Do not invent content to fill gaps.

FORBIDDEN OUTPUT (never write these):
- Openings like "In this article", "This piece", "This post", "The author argues/explains" (or target-language equivalents).
- Generic AI/marketing language: "In today's fast-paced world", "delve", "dive into", "unlock", "supercharge", "seamless", "AI-powered", "game-changing", "revolutionary", "tailored just for you".
- Empty hype, padding ("It's important to note", "Moreover/Furthermore" filler).`;

export function buildArticleUserPrompt(req: SummarizeRequest): string {
  const topic = topicBySlug(req.primaryTopic);
  const topicLabel = topic?.label ?? req.primaryTopic;
  const body =
    req.cleanedText && req.cleanedText.length > 0
      ? truncate(req.cleanedText, 18_000)
      : truncate(req.rawExcerpt ?? "", 4_000);

  return `Article metadata:
- title: ${j(req.title)}
- sourceName: ${j(req.sourceName)}
- url: ${j(req.url)}
- sourceLanguage: ${j(req.sourceLanguage)}
- targetLanguage: ${j(req.targetLanguage)}
- framingTopic: ${j(topicLabel)}
- difficulty: ${j(req.difficulty)}

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
- summaryLanguage MUST equal ${j(req.targetLanguage)}.
- originalTitle MUST equal ${j(req.title)}.
- originalUrl MUST equal ${j(req.url)}.
- confidence is an integer 0..100 — be honest; extraction quality matters.
- Frame it so a subscriber whose primary interest is "${topicLabel}" sees why it's relevant.`;
}

/* ----------------------------------------------------------------------- */
/* Schema (Zod) — validates Gemini JSON before we trust it.                 */
/* ----------------------------------------------------------------------- */

const nonEmpty = z.string().trim().min(1);

/** Coerce a 3-tuple of non-empty strings; rejects if fewer than 3 usable. */
const trio = z
  .array(z.string())
  .transform((a) => a.map((s) => s.trim()).filter(Boolean))
  .refine((a) => a.length >= 3, { message: "expected 3 non-empty strings" });

const quintet = z
  .array(z.string())
  .transform((a) => a.map((s) => s.trim()).filter(Boolean))
  .refine((a) => a.length >= 5, { message: "expected 5 non-empty strings" });

export const ArticleBriefSchema = z.object({
  subject: nonEmpty.min(4),
  preheader: z.string().trim().default(""),
  displayTitle: z.string().trim().default(""),
  originalTitle: z.string().trim().default(""),
  sourceName: z.string().trim().default(""),
  summaryLanguage: z.string().trim().default(""),
  readingTime: z.string().trim().default("5 min"),
  oneLineHook: nonEmpty.min(4),
  whyThisArticle: z.string().trim().default(""),
  threeSentenceSummary: trio,
  keyTakeaways: quintet,
  bestFor: trio,
  oneThingToRemember: z.string().trim().default(""),
  originalUrl: z.string().trim().default(""),
  confidence: z.coerce.number().default(0),
  editorNotes: z.string().trim().default(""),
});

export type ArticleBriefValidated = z.infer<typeof ArticleBriefSchema>;

/* ----------------------------------------------------------------------- */
/* Helpers                                                                  */
/* ----------------------------------------------------------------------- */

function truncate(s: string, max: number): string {
  if (!s) return "";
  return s.length <= max ? s : `${s.slice(0, max)}\n\n[...truncated]`;
}

function j(s: string): string {
  return JSON.stringify(s ?? "");
}
