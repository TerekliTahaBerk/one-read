/**
 * OneRead — manual summary generator (no dev server, no email).
 *
 * Generates a structured summary for one article in English and/or Turkish,
 * exercising the real LLM summarizer + the Summary cache. Reports cache
 * HIT/MISS so you can verify duplicate LLM calls are prevented.
 *
 * Usage:
 *   npm run summarize                          # newest SCORED article, EN + TR
 *   npm run summarize -- --lang English        # only English
 *   npm run summarize -- --lang Turkish        # only Turkish
 *   npm run summarize -- --article <id|url>    # specific article
 *   npm run summarize -- --twice               # run each lang twice (HIT demo)
 *
 * In development with no AI_PROVIDER, the heuristic provider is used (marked
 * READY in dev only). Set AI_PROVIDER + key to test real LLM summaries.
 */

import { prisma } from "../lib/prisma";
import { getOrCreateSummary, type SummaryRequest } from "../lib/summarizer";
import { getLlmStatus } from "../lib/llm";
import type { Article } from "@prisma/client";

async function main() {
  const langArg = argValue("--lang");
  const languages = langArg ? [langArg] : ["English", "Turkish"];
  const twice = process.argv.includes("--twice");
  const articleArg = argValue("--article");

  const llm = getLlmStatus();
  console.log(
    `[summarize] provider=${llm.provider}/${llm.model} configured=${llm.configured} NODE_ENV=${process.env.NODE_ENV ?? "development"}`,
  );

  const article = await resolveArticle(articleArg);
  if (!article) {
    console.error(
      "[summarize] No suitable article found. Run `npm run ingest` then `npm run score` first, or pass --article <id|url>.",
    );
    process.exitCode = 1;
    return;
  }
  console.log(`[summarize] article: ${article.title}`);
  console.log(`[summarize]   ${article.sourceName} · ${article.topic} · status=${article.scoringStatus}`);

  // Summaries are cached per TopicDailyPick. Ensure one exists for this
  // article so the FK + cache key resolve. Keyed by (date, topic, lang).
  const pick = await ensurePick(article);

  const difficulty = article.difficulty || "mixed";

  for (const lang of languages) {
    console.log(`\n========== ${lang} ==========`);
    const passes = twice ? 2 : 1;
    for (let i = 0; i < passes; i++) {
      const cacheKey = {
        topicDailyPickId_summaryLanguage_primaryTopic_difficulty: {
          topicDailyPickId: pick.id,
          summaryLanguage: lang,
          primaryTopic: pick.topic,
          difficulty,
        },
      };
      const before = await prisma.summary.findUnique({ where: cacheKey });
      const hit = before ? "HIT" : "MISS";

      const req: SummaryRequest = {
        pick: {
          id: pick.id,
          topic: pick.topic,
          subtopics: pick.subtopics,
          articleTitle: pick.articleTitle,
          sourceName: pick.sourceName,
        },
        article: {
          title: article.title,
          url: article.url,
          rawExcerpt: article.rawExcerpt,
          cleanedText: article.cleanedText,
          sourceLanguage: article.sourceLanguage,
          sourceName: article.sourceName,
        },
        summaryLanguage: lang,
        primaryTopic: pick.topic,
        difficulty,
      };

      const t0 = Date.now();
      const result = await getOrCreateSummary(req);
      console.log(
        `[cache:${hit}] pass ${i + 1}/${passes} · status=${result.status} confidence=${result.confidence ?? "—"} generator=${result.generator ?? "—"} in ${Date.now() - t0}ms`,
      );
      if (result.rejectionReason) {
        console.log(`  rejectionReason: ${result.rejectionReason}`);
      }
      if (i === passes - 1) printStructured(result.structured, result.bodyText);
    }
  }
}

/** Resolve target article by id, url, or fall back to newest SCORED. */
async function resolveArticle(arg: string | undefined): Promise<Article | null> {
  if (arg) {
    const byId = await prisma.article.findUnique({ where: { id: arg } });
    if (byId) return byId;
    const byUrl = await prisma.article.findFirst({
      where: { OR: [{ url: arg }, { canonicalUrl: arg }] },
    });
    if (byUrl) return byUrl;
    return null;
  }
  // Prefer a high-quality SCORED article; fall back to any with cleaned text.
  return (
    (await prisma.article.findFirst({
      where: { scoringStatus: "SCORED" },
      orderBy: { qualityScore: "desc" },
    })) ??
    (await prisma.article.findFirst({ orderBy: { ingestedAt: "desc" } }))
  );
}

/** Find or create a TopicDailyPick for this article (today, by topic+lang). */
async function ensurePick(article: Article) {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);

  const existing = await prisma.topicDailyPick.findFirst({
    where: { articleId: article.id },
    orderBy: { createdAt: "desc" },
  });
  if (existing) return existing;

  return prisma.topicDailyPick.upsert({
    where: {
      date_topic_sourceLanguage: {
        date,
        topic: article.topic,
        sourceLanguage: article.sourceLanguage,
      },
    },
    update: {},
    create: {
      date,
      topic: article.topic,
      subtopics: article.subtopics,
      sourceLanguage: article.sourceLanguage,
      articleId: article.id,
      articleTitle: article.title,
      sourceName: article.sourceName,
      score: article.qualityScore,
      reasonForSelection: article.reasonForSelection,
      status: "DRAFT",
    },
  });
}

function printStructured(
  s:
    | {
        subject: string;
        displayTitle: string;
        oneLineHook: string;
        threeSentenceSummary: string[];
        keyTakeaways: string[];
        oneThingToRemember: string;
        editorNotes: string;
      }
    | undefined,
  bodyText: string,
) {
  if (!s) {
    console.log("  (no structured summary — heuristic body)");
    console.log("  " + bodyText.replace(/\n/g, "\n  "));
    return;
  }
  console.log(`  subject:      ${s.subject}`);
  console.log(`  displayTitle: ${s.displayTitle}`);
  console.log(`  hook:         ${s.oneLineHook}`);
  console.log(`  3-sentence:`);
  s.threeSentenceSummary.forEach((x, i) => console.log(`    ${i + 1}. ${x}`));
  console.log(`  takeaways:`);
  s.keyTakeaways.forEach((x) => console.log(`    - ${x}`));
  console.log(`  remember:     ${s.oneThingToRemember}`);
  if (s.editorNotes) console.log(`  editorNotes:  ${s.editorNotes}`);
}

function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

main()
  .catch((err) => {
    console.error("[summarize] failed:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
