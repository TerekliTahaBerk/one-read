/**
 * OneRead — OneNews prompt module (Gemini brain).
 *
 * OneNews is a Turkish-first, sponsor-free, 5-minute morning briefing sent at
 * 06:30. It covers markets, economy, business, politics, technology, and
 * weekend extras in a short, plain, concise style.
 *
 * STRICTLY source-grounded. The model is given a fixed, numbered bundle of REAL
 * stories (headline/source/url/excerpt) and may only select, compress, group,
 * frame, and explain them. It refers to stories BY INDEX — it never emits source
 * names or URLs (those are copied verbatim from the bundle in the generator).
 * This is the core anti-hallucination guarantee for OneNews.
 *
 * Output (model side) shape stays index-based to match the parser; the generator
 * maps it into the stored `NewsIssueContent` shape.
 */

import { z } from "zod";
import type { NewsSourceStory } from "@prisma/client";
import type { NewsSegment } from "./segments";

/** Bump when the prompt or schema changes in a way that affects output. */
export const NEWS_PROMPT_VERSION = "news-briefing/v3-morning-brief";

export const NEWS_SYSTEM_PROMPT = `You are OneNews — a calm, human editor who writes a Turkish-first, sponsor-free, 5-minute morning briefing delivered at 06:30 (Europe/Istanbul).

WHAT ONENEWS IS:
- A short, plain, concise morning email. The reader should feel informed in 5 minutes.
- It covers, in priority order: markets (Piyasalar), economy (Ekonomi), business (İş dünyası), politics (Politika), technology (Teknoloji). Other categories (Dünya, Türkiye, Kültür, Bilim, Spor, Hafta sonu) appear only when the source bundle supports them.
- Tone: kısa, yalın, öz, güvenilir, sakin, reklamsız (calm, plain, concise, trustworthy, ad-free).

WHAT ONENEWS IS NOT:
- NOT a breaking-news alert. NOT a long magazine newsletter. NOT a doomscrolling feed.
- NOT generic AI news text. NOT a sponsored or corporate newsletter.
- Do not use a formal "değerli okuyucular" newsletter tone. Do not pad with filler.

EDITORIAL TASK:
- SELECT, COMPRESS, and ORGANIZE the day's most important developments. Use editorial judgment.
- Write with a human rhythm. Avoid AI-sounding phrasing. Do NOT start several sentences the same way.
- Keep the tone calm. No clickbait, no dramatic adjectives, no fake certainty, no fear-based framing, no "BREAKING".

ABSOLUTE SOURCE-GROUNDING RULES:
- You are given a FIXED, numbered list of REAL stories (headline, source, url, excerpt). You MUST NOT invent, add, or merge new stories.
- Refer to each story ONLY by its "index". NEVER output a source name or URL — those are attached automatically from the real bundle.
- Do NOT invent facts, numbers, quotes, names, dates, or sources. Only restate what an excerpt supports. If an excerpt is thin, say less rather than speculating.
- If sources conflict, say so plainly. Never imply certainty the sources don't have.

SPONSOR-FREE RULE:
- NEVER include sponsor blocks, paid placements, "Bugünkü destekçimiz", "Sponsorlu", "Günün önerileri", brand campaign copy, sales/collaboration CTAs, advertising copy, or cross-promo. None of this may appear anywhere in the output.

OUTPUT RULES:
- Return ONE JSON object. No prose, no markdown, no code fences, no markdown tables.
- Write all reader-facing text in the requested briefing language.
- subject and previewText must be calm, source-specific inbox copy naming one or two concrete developments. No "breaking", "urgent", generic "Bugünün gündemi" subjects, or abstract topic lists.

FORBIDDEN OUTPUT:
- Marketing / AI-slop phrases ("unlock", "supercharge", "seamless", "dive into", "AI-powered", "game-changing", etc.).
- Sensational or fear-based framing.
- Any URL or source name in your JSON (indexes only).
- Any sponsor / advertising / sales copy.`;

export function buildNewsUserPrompt(
  seg: NewsSegment,
  stories: NewsSourceStory[],
  opts: { tone?: string | null; depth?: string | null; today?: string },
): string {
  const items = stories.map((s, i) => ({
    index: i,
    headline: s.headline,
    source: s.sourceName,
    url: s.sourceUrl,
    topic: s.topic,
    excerpt: s.excerpt ?? "",
  }));

  return `Write today's OneNews 5-minute morning briefing.

Today: ${opts.today ?? new Date().toISOString().slice(0, 10)}
Briefing language: ${seg.briefingLanguage}
Region focus: ${seg.regionFocus}
Tone: ${opts.tone ?? "Calm"}; Depth: ${opts.depth ?? "Short"}

REAL stories (fixed bundle — refer to them by index only; never output source/url):
${JSON.stringify(items, null, 2)}

Return JSON with EXACTLY these fields:
{
  "subject": string,            // calm, specific email subject naming 1–2 concrete developments
  "previewText": string,        // ~80 char calm preheader
  "greeting": string,           // short natural morning greeting (e.g. a date + "günaydın")
  "mainHeadline": string,       // compact headline from the 1–2 most important developments
  "mainSummary": string,        // 2–4 sentences, ~50–90 words, source-grounded, calm
  "agendaItems": [              // 5–8 items max, prioritise markets/economy/business/politics/technology
    { "index": number, "category": string, "title": string, "summary": string, "whyItMatters": string }
  ],
  "alsoToday": [string],        // optional, 0–4 very short items for less important developments
  "weekendExtra": [             // optional; ONLY on weekends or when weekend material exists
    { "index": number, "title": string, "summary": string }
  ]
}

Rules:
- agendaItems: 5–8 entries max, each concise (one short sentence). "whyItMatters" only when genuinely useful (may be ""). category is a short Turkish label.
- alsoToday: short comma-free items; omit or use [] when nothing extra is worth it. No sponsor/promotional content.
- weekendExtra: omit or use [] unless there is genuine weekend/culture/agenda material. Keep it very short.
- Every agendaItems[i].index and weekendExtra[i].index MUST be a valid index from the bundle above. Do not reuse the same index twice.
- Write all reader-facing text in ${seg.briefingLanguage}.`;
}

/* ----------------------------------------------------------------------- */
/* Schema (Zod) — validates the model's index-based output.                 */
/* ----------------------------------------------------------------------- */

const nonEmpty = z.string().trim().min(1);

const AgendaItemSchema = z.object({
  index: z.number().int().nonnegative(),
  category: z.string().trim().default(""),
  title: z.string().trim().default(""),
  summary: nonEmpty,
  whyItMatters: z.string().trim().default(""),
});

const WeekendItemSchema = z.object({
  index: z.number().int().nonnegative(),
  title: z.string().trim().default(""),
  summary: z.string().trim().default(""),
});

export const NewsBriefingSchema = z.object({
  subject: nonEmpty.min(4),
  previewText: z.string().trim().default(""),
  greeting: z.string().trim().default(""),
  mainHeadline: z.string().trim().default(""),
  mainSummary: z.string().trim().default(""),
  agendaItems: z.array(AgendaItemSchema).min(1).max(8),
  alsoToday: z.array(z.string().trim().min(1)).max(6).optional().default([]),
  weekendExtra: z.array(WeekendItemSchema).max(4).optional().default([]),
});

export type NewsBriefingValidated = z.infer<typeof NewsBriefingSchema>;
