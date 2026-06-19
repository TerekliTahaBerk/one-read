import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import type { NewsSourceStory } from "@prisma/client";
import type { NewsSegment } from "./segments";
import type { GeneratedNewsIssue, NewsIssueContent, NewsStory } from "./types";

/**
 * OneNews issue generator. STRICTLY source-grounded: it only ever rewrites the
 * calm summary / "why it matters" framing of REAL stories passed in. It never
 * invents stories, sources, or URLs — those are copied verbatim from the
 * provided NewsSourceStory rows. With no sources it returns generated:false
 * (NO_SOURCES) so the pipeline shows an admin warning instead of fake news.
 *
 * Pure: never reads or writes the database. The pipeline handles caching.
 */

export interface NewsGenerateOptions {
  tone?: string | null;
  depth?: string | null;
  /** Allow the deterministic (non-AI) framing even in production. Default true —
   *  it is still 100% grounded (uses only real headline/excerpt/url). */
  allowDeterministic?: boolean;
}

const SYSTEM_PROMPT = `You are OneNews, a calm editor who writes a short morning briefing.
Tone: calm, clear, trustworthy, balanced, concise, editorial. Never clickbait, never doomscrolling, never sensational, never partisan, never fear-based.
HARD RULES:
- You are given a fixed list of REAL stories (headline, source, url, excerpt). You MUST NOT invent, add, merge, or remove stories.
- Do NOT invent facts, numbers, quotes, names, or sources. Only restate what the excerpt supports.
- Keep "source" and "url" EXACTLY as provided for each story. Never change a URL.
- If an excerpt is thin, keep the summary short and factual rather than speculating.
- Avoid graphic detail. Avoid partisan framing.
Return STRICT JSON ONLY matching the requested schema.`;

function buildUserPrompt(
  seg: NewsSegment,
  stories: NewsSourceStory[],
  opts: NewsGenerateOptions,
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

REAL stories (do not change source/url, do not invent):
${JSON.stringify(items, null, 2)}

Return JSON with EXACTLY these fields:
{
  "subject": string,            // calm email subject
  "previewText": string,        // ~80 char preheader
  "openingLine": string,        // one calm sentence
  "topStories": [               // SAME count and order as the input stories
    { "index": number, "title": string, "summary": string, "whyItMatters": string }
  ],
  "oneStoryToWatch": { "index": number, "note": string },  // pick one of the stories, forward-looking, calm
  "quietContext": string        // one short, non-anxious framing paragraph
}
Write summaries and framing in ${seg.briefingLanguage}.`;
}

async function callJson(
  system: string,
  user: string,
): Promise<{ raw: unknown | null; provider: string | null; model: string | null }> {
  const provider = (process.env.AI_PROVIDER || "").toLowerCase();

  if (provider === "anthropic" && process.env.ANTHROPIC_API_KEY) {
    const model = process.env.AI_MODEL || "claude-3-5-haiku-latest";
    try {
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const res = await client.messages.create({
        model,
        max_tokens: 2048,
        temperature: 0.3,
        system,
        messages: [{ role: "user", content: user }],
      });
      const block = res.content?.[0];
      const text = block && "text" in block ? block.text : "";
      return { raw: text ? safeJson(text) : null, provider: "anthropic", model };
    } catch (err) {
      console.error("[news/generator] anthropic call failed:", errMsg(err));
      return { raw: null, provider: "anthropic", model };
    }
  }

  if (provider === "openai" && process.env.OPENAI_API_KEY) {
    const model = process.env.AI_MODEL || "gpt-4o-mini";
    try {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const res = await client.chat.completions.create({
        model,
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      });
      const text = res.choices?.[0]?.message?.content ?? "";
      return { raw: text ? safeJson(text) : null, provider: "openai", model };
    } catch (err) {
      console.error("[news/generator] openai call failed:", errMsg(err));
      return { raw: null, provider: "openai", model };
    }
  }

  return { raw: null, provider: null, model: null };
}

export async function generateNewsIssue(
  seg: NewsSegment,
  stories: NewsSourceStory[],
  opts: NewsGenerateOptions = {},
): Promise<GeneratedNewsIssue> {
  // Rule #1: no real sources → never fabricate.
  if (stories.length === 0) {
    return {
      title: `${seg.regionFocus} briefing`,
      subject: "OneNews: your calm morning briefing",
      previewText: "",
      content: emptyContent(),
      generated: false,
      reason: "NO_SOURCES",
      provider: null,
      model: null,
      metadata: { source: "none", reason: "no_source_material" },
    };
  }

  const top = stories.slice(0, 5);
  const { raw, provider, model } = await callJson(
    SYSTEM_PROMPT,
    buildUserPrompt(seg, top, opts),
  );

  const parsed = raw ? parseIssue(raw, top, seg) : null;
  if (parsed) {
    return {
      ...parsed,
      generated: true,
      provider,
      model,
      metadata: { source: "ai", provider, model, storyCount: top.length },
    };
  }

  // Deterministic, fully-grounded fallback: use the real headline + excerpt +
  // url. No invented facts. This is allowed in production because it copies
  // only real source material.
  if (opts.allowDeterministic !== false) {
    return {
      ...deterministicIssue(seg, top),
      generated: true,
      provider: "deterministic",
      model: "deterministic",
      metadata: { source: "deterministic", aiAttempted: provider !== null, storyCount: top.length },
    };
  }

  return {
    title: `${seg.regionFocus} briefing`,
    subject: "OneNews: your calm morning briefing",
    previewText: "",
    content: emptyContent(),
    generated: false,
    reason: "GENERATION_UNAVAILABLE",
    provider,
    model,
    metadata: { source: "none" },
  };
}

/* ----------------------------------------------------------------------- */
/* Parsing / validation                                                    */
/* ----------------------------------------------------------------------- */

function parseIssue(
  raw: unknown,
  stories: NewsSourceStory[],
  seg: NewsSegment,
): Omit<GeneratedNewsIssue, "generated" | "provider" | "model" | "metadata"> | null {
  if (!isRecord(raw) || !Array.isArray(raw.topStories)) return null;

  const byIndex = new Map<number, { title: string; summary: string; whyItMatters: string }>();
  for (const item of raw.topStories) {
    if (!isRecord(item)) continue;
    const idx = typeof item.index === "number" ? item.index : NaN;
    if (!Number.isInteger(idx) || idx < 0 || idx >= stories.length) continue;
    byIndex.set(idx, {
      title: str(item.title, stories[idx].headline),
      summary: str(item.summary, stories[idx].excerpt ?? ""),
      whyItMatters: str(item.whyItMatters, ""),
    });
  }
  if (byIndex.size === 0) return null;

  // Source + url are ALWAYS taken from the real story, never from the model.
  const topStories: NewsStory[] = stories.map((s, i) => {
    const m = byIndex.get(i);
    return {
      title: m?.title || s.headline,
      source: s.sourceName,
      summary: m?.summary || (s.excerpt ?? ""),
      whyItMatters: m?.whyItMatters || "",
      url: s.sourceUrl,
    };
  });

  const watchRaw = isRecord(raw.oneStoryToWatch) ? raw.oneStoryToWatch : null;
  let oneStoryToWatch: NewsIssueContent["oneStoryToWatch"];
  if (watchRaw && typeof watchRaw.index === "number" && stories[watchRaw.index]) {
    const s = stories[watchRaw.index];
    oneStoryToWatch = {
      title: s.headline,
      note: str(watchRaw.note, ""),
      source: s.sourceName,
      url: s.sourceUrl,
    };
  }

  const content: NewsIssueContent = {
    openingLine: str(raw.openingLine, "Here is your calm morning briefing."),
    topStories,
    oneStoryToWatch,
    quietContext: str(raw.quietContext, "") || undefined,
    sources: stories.map((s) => ({ source: s.sourceName, url: s.sourceUrl })),
  };

  const subject = str(raw.subject, "Today’s OneNews: the stories worth knowing");
  const previewText = str(raw.previewText, content.openingLine).slice(0, 140);
  const title = `${seg.regionFocus} briefing`;
  if (subject.length < 4 || content.topStories.length < 1) return null;
  return { title, subject, previewText, content };
}

function deterministicIssue(
  seg: NewsSegment,
  stories: NewsSourceStory[],
): Omit<GeneratedNewsIssue, "generated" | "provider" | "model" | "metadata"> {
  const topStories: NewsStory[] = stories.map((s) => ({
    title: s.headline,
    source: s.sourceName,
    summary: s.excerpt ?? "",
    whyItMatters: "",
    url: s.sourceUrl,
  }));
  const content: NewsIssueContent = {
    openingLine: "Here is your calm morning briefing — the stories worth knowing today.",
    topStories,
    oneStoryToWatch: undefined,
    quietContext: undefined,
    sources: stories.map((s) => ({ source: s.sourceName, url: s.sourceUrl })),
  };
  return {
    title: `${seg.regionFocus} briefing`,
    subject: "Today’s OneNews: the stories worth knowing",
    previewText: "A short, calm briefing with links to the original sources.",
    content,
  };
}

function emptyContent(): NewsIssueContent {
  return { openingLine: "", topStories: [], sources: [] };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function str(v: unknown, dflt: string): string {
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : dflt;
}

function safeJson(text: string): unknown | null {
  try {
    const cleaned = text
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/```$/i, "")
      .trim();
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
