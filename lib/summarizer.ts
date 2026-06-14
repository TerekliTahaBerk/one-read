/**
 * One Read — summary generation + cache.
 *
 * For each (TopicDailyPick, summaryLanguage, primaryTopic, difficulty) we
 * generate the summary at most once. The cache lives in the `Summary`
 * table — see `prisma/schema.prisma`.
 *
 * The actual LLM call is delegated to `SummaryProvider`. The default
 * provider is a deterministic heuristic that returns the article excerpt
 * lightly framed for the user's primary topic. Swap in OpenAI / Anthropic /
 * etc. by implementing the interface and passing it to `getOrCreateSummary`.
 */

import { prisma } from "./prisma";
import { topicBySlug } from "./topics";
import type { Article, TopicDailyPick } from "@prisma/client";

export interface SummaryRequest {
  pick: Pick<
    TopicDailyPick,
    "id" | "topic" | "subtopics" | "articleTitle" | "sourceName"
  >;
  article: Pick<
    Article,
    "title" | "url" | "rawExcerpt" | "sourceLanguage" | "sourceName"
  >;
  /** "English" | "Turkish" */
  summaryLanguage: string;
  /** Slug of the user's matched interest — used for editorial framing. */
  primaryTopic: string;
  /** "beginner" | "intermediate" | "advanced" | "mixed" */
  difficulty: string;
}

export interface SummaryResult {
  bodyText: string;
  bodyHtml?: string;
}

export interface SummaryProvider {
  generate(req: SummaryRequest): Promise<SummaryResult>;
}

/* ----------------------------------------------------------------------- */
/* Default heuristic provider                                              */
/* ----------------------------------------------------------------------- */

/**
 * Deterministic, no-LLM fallback. Faithful to the article excerpt, never
 * invents content. Keeps One Read trustworthy even before an LLM is wired.
 */
export const heuristicSummaryProvider: SummaryProvider = {
  async generate(req) {
    const excerpt = (req.article.rawExcerpt ?? "").trim();
    const topic = topicBySlug(req.primaryTopic);
    const lang = req.summaryLanguage;

    const intro =
      lang === "Turkish"
        ? `${req.article.sourceName} kaynağından, ${topic?.label ?? "seçili konunda"} alanında bir yazı:`
        : `From ${req.article.sourceName}, on ${topic?.label ?? "your selected topic"}:`;

    const fallback =
      lang === "Turkish"
        ? "Yazının özetini sabah okumak için size bir rehber: ana fikri kısaca aktarır, gerekirse tam metne yönlendirir."
        : "A short read to start your morning: the main idea, distilled — follow the link for the full piece.";

    const body = excerpt.length > 0 ? excerpt : fallback;

    const text = `${intro}\n\n${body}`;
    const html = `
<p style="margin:0 0 14px 0;color:#6B5F50;font-size:13px;font-style:italic;">${escapeHtml(intro)}</p>
<p style="margin:0;color:#1B1612;font-size:15.5px;line-height:1.65;">${escapeHtml(body)}</p>
    `.trim();

    return { bodyText: text, bodyHtml: html };
  },
};

/* ----------------------------------------------------------------------- */
/* Cache-aware entry point                                                 */
/* ----------------------------------------------------------------------- */

/**
 * Returns a cached summary for the given context if one exists; otherwise
 * generates via `provider`, persists, and returns it.
 *
 * Concurrency note: a unique constraint on
 * (topicDailyPickId, summaryLanguage, primaryTopic, difficulty) makes a
 * second concurrent insert fail; we treat that as a benign race and re-read.
 */
export async function getOrCreateSummary(
  req: SummaryRequest,
  provider: SummaryProvider = heuristicSummaryProvider,
): Promise<SummaryResult> {
  const cacheKey = {
    topicDailyPickId: req.pick.id,
    summaryLanguage: req.summaryLanguage,
    primaryTopic: req.primaryTopic,
    difficulty: req.difficulty,
  };

  const cached = await prisma.summary.findUnique({
    where: {
      topicDailyPickId_summaryLanguage_primaryTopic_difficulty: cacheKey,
    },
  });
  if (cached) return { bodyText: cached.bodyText, bodyHtml: cached.bodyHtml ?? undefined };

  const generated = await provider.generate(req);

  try {
    await prisma.summary.create({
      data: {
        ...cacheKey,
        bodyText: generated.bodyText,
        bodyHtml: generated.bodyHtml ?? null,
      },
    });
  } catch (err) {
    // Race: another worker beat us to it. Re-read silently.
    const fresh = await prisma.summary.findUnique({
      where: {
        topicDailyPickId_summaryLanguage_primaryTopic_difficulty: cacheKey,
      },
    });
    if (fresh) {
      return {
        bodyText: fresh.bodyText,
        bodyHtml: fresh.bodyHtml ?? undefined,
      };
    }
    throw err;
  }

  return generated;
}

/* ----------------------------------------------------------------------- */
/* Helpers                                                                 */
/* ----------------------------------------------------------------------- */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
