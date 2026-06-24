/**
 * OneRead — one-shot demo preview (development only, no AI key, no email).
 *
 * Runs the whole preview flow end to end so you can see:
 *   demo article → topic pick → summary → email preview → dry-run mapping
 *
 * Steps:
 *   1. Seed demo articles (idempotent).
 *   2. Score PENDING articles (heuristic in dev).
 *   3. Force a preview TopicDailyPick for each SCORED demo article.
 *   4. Generate a summary (EN) for each preview pick.
 *   5. Print admin preview instructions.
 *
 * Production-safe: refuses to run when NODE_ENV === "production". Uses
 * relaxed DEMO thresholds for the dry-run summary only — production
 * thresholds are never modified, and no real email is sent.
 *
 * Usage:  npm run demo:preview
 */

import { prisma } from "../lib/prisma";
import { extractAndScorePendingArticles } from "../lib/scorer";
import { createPreviewPick, runDailyPipeline } from "../lib/pipeline";
import { getOrCreateSummary } from "../lib/summarizer";
import { seedDemoArticles, DEMO_SOURCE_NAME } from "./seed-demo-articles";

async function main() {
  if (process.env.NODE_ENV === "production") {
    console.error("[demo:preview] Refusing to run in production.");
    process.exitCode = 1;
    return;
  }

  // 1. Seed demo articles.
  console.log("[demo:preview] 1/5 seeding demo articles…");
  const seed = await seedDemoArticles();
  console.log(
    `[demo:preview]     demo articles in pool: ${seed.total} (created=${seed.created} updated=${seed.updated})`,
  );

  // 2. Score PENDING.
  console.log("[demo:preview] 2/5 scoring PENDING articles…");
  const scored = await extractAndScorePendingArticles();
  console.log(
    `[demo:preview]     scored=${scored.scored} rejected=${scored.rejected} failed=${scored.failed}`,
  );

  // 3. Force preview picks for SCORED demo articles (one per topic slot).
  console.log("[demo:preview] 3/5 creating preview picks…");
  const demoArticles = await prisma.article.findMany({
    where: { sourceName: DEMO_SOURCE_NAME, scoringStatus: "SCORED" },
    orderBy: { qualityScore: "desc" },
  });
  let pickCount = 0;
  const pickedArticleIds: string[] = [];
  for (const a of demoArticles) {
    const { pick } = await createPreviewPick(a.id, { demo: true });
    if (pick) {
      pickCount++;
      pickedArticleIds.push(a.id);
    }
  }
  console.log(`[demo:preview]     preview picks ready: ${pickCount}`);

  // 4. Generate an English summary for each preview pick.
  console.log("[demo:preview] 4/5 generating summaries (English)…");
  const picks = await prisma.topicDailyPick.findMany({
    where: { articleId: { in: pickedArticleIds } },
    include: { article: true },
    orderBy: { createdAt: "desc" },
  });
  let ready = 0;
  for (const pick of picks) {
    if (!pick.article) continue;
    const result = await getOrCreateSummary({
      pick: {
        id: pick.id,
        topic: pick.topic,
        subtopics: pick.subtopics,
        articleTitle: pick.articleTitle,
        sourceName: pick.sourceName,
      },
      article: {
        title: pick.article.title,
        url: pick.article.url,
        rawExcerpt: pick.article.rawExcerpt,
        cleanedText: pick.article.cleanedText,
        sourceLanguage: pick.article.sourceLanguage,
        sourceName: pick.article.sourceName,
      },
      summaryLanguage: "English",
      primaryTopic: pick.topic,
      difficulty: pick.article.difficulty || "mixed",
    });
    if (result.status === "READY") ready++;
  }
  console.log(`[demo:preview]     READY summaries: ${ready}/${picks.length}`);

  // 5. Demo dry-run (relaxed thresholds, no send) for the mapping snapshot.
  console.log("[demo:preview] 5/5 demo dry-run mapping (no email sent)…");
  await runDailyPipeline({ dryRun: true, skipIngest: true, demo: true });

  console.log("\n[demo:preview] ✓ Done. Next:");
  console.log("  • Open  /admin?token=<ADMIN_TOKEN>  → 'Email preview' section");
  console.log("  • Turkish: npm run summarize -- --lang Turkish --twice");
  console.log(
    "  • Everything above is heuristic-dev / render-only. No real LLM, no real email.",
  );
}

main()
  .catch((err) => {
    console.error("[demo:preview] failed:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
