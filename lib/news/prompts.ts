/**
 * OneRead — OneNews prompt module (Gemini brain).
 *
 * STRICTLY source-grounded. The model is given a fixed, numbered bundle of REAL
 * stories (headline/source/url/excerpt) and may only summarize, group, frame,
 * and explain them. It refers to stories BY INDEX — it never emits source names
 * or URLs (those are copied verbatim from the bundle in the generator). This is
 * the core anti-hallucination guarantee for OneNews.
 *
 * Output (model side) shape stays index-based to match the existing parser; the
 * generator maps it into the stored `NewsIssueContent` shape.
 */

import { z } from "zod";
import type { NewsSourceStory } from "@prisma/client";
import type { NewsSegment } from "./segments";

/** Bump when the prompt or schema changes in a way that affects output. */
export const NEWS_PROMPT_VERSION = "news-briefing/v1-gemini";

export const NEWS_SYSTEM_PROMPT = `You are OneNews, a calm editor who writes a short, trustworthy morning briefing.

ROLE & TONE:
- Calm, clear, balanced, concise, editorial. Never clickbait, never doomscrolling, never sensational, never partisan, never fear-based.
- "The stories worth knowing, without the noise."

ABSOLUTE SOURCE-GROUNDING RULES:
- You are given a FIXED, numbered list of REAL stories (headline, source, url, excerpt). You MUST NOT invent, add, merge, or remove stories.
- Refer to each story ONLY by its "index". NEVER output a source name or URL — those are attached automatically from the real bundle.
- Do NOT invent facts, numbers, quotes, names, dates, or sources. Only restate what an excerpt supports.
- If an excerpt is thin, keep the summary short and factual rather than speculating.
- If sources conflict, say so plainly. Do not imply certainty the sources don't have.
- Avoid graphic detail. Avoid partisan framing. No "BREAKING" / fake-urgency language.

OUTPUT RULES:
- Return ONE JSON object. No prose, no markdown, no code fences.
- Use 3–5 top stories (or fewer if fewer real stories are provided), in the input order.
- Write summaries and framing in the requested briefing language.

FORBIDDEN OUTPUT:
- Marketing/AI-slop phrases ("unlock", "supercharge", "seamless", "dive into", "AI-powered", "game-changing", etc.).
- Sensational or fear-based "breaking news" framing.
- Any URL or source name in your JSON (indexes only).`;

export function buildNewsUserPrompt(
  seg: NewsSegment,
  stories: NewsSourceStory[],
  opts: { tone?: string | null; depth?: string | null },
): string {
  const items = stories.map((s, i) => ({
    index: i,
    headline: s.headline,
    source: s.sourceName,
    url: s.sourceUrl,
    excerpt: s.excerpt ?? "",
  }));

  return `Write today's OneNews briefing.

Briefing language: ${seg.briefingLanguage}
Region focus: ${seg.regionFocus}
Tone: ${opts.tone ?? "Calm"}; Depth: ${opts.depth ?? "Short"}

REAL stories (fixed bundle — refer to them by index only; never output source/url):
${JSON.stringify(items, null, 2)}

Return JSON with EXACTLY these fields:
{
  "subject": string,            // calm email subject, no "breaking"
  "previewText": string,        // ~80 char preheader
  "openingLine": string,        // one calm sentence
  "topStories": [               // one entry per provided story you include, in order
    { "index": number, "title": string, "summary": string, "whyItMatters": string, "topic": string }
  ],
  "oneStoryToWatch": { "index": number, "note": string } | null,  // optional, forward-looking, calm
  "quietContext": string        // one short, non-anxious framing paragraph
}
Write summaries and framing in ${seg.briefingLanguage}. Every topStories[i].index MUST be a valid index from the bundle above.`;
}

/* ----------------------------------------------------------------------- */
/* Schema (Zod) — validates the model's index-based output.                 */
/* ----------------------------------------------------------------------- */

const nonEmpty = z.string().trim().min(1);

const TopStorySchema = z.object({
  index: z.number().int().nonnegative(),
  title: z.string().trim().default(""),
  summary: nonEmpty,
  whyItMatters: z.string().trim().default(""),
  topic: z.string().trim().default(""),
});

export const NewsBriefingSchema = z.object({
  subject: nonEmpty.min(4),
  previewText: z.string().trim().default(""),
  openingLine: z.string().trim().default(""),
  topStories: z.array(TopStorySchema).min(1).max(5),
  oneStoryToWatch: z
    .object({ index: z.number().int().nonnegative(), note: z.string().trim().default("") })
    .nullable()
    .optional(),
  quietContext: z.string().trim().default(""),
});

export type NewsBriefingValidated = z.infer<typeof NewsBriefingSchema>;
