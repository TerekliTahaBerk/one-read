/**
 * One Read — editorial pipeline smoke test.
 *
 * Seeds two synthetic articles, an ACTIVE subscriber, runs a minimal
 * version of the pipeline (TopicDailyPick selection), prints the result,
 * then cleans up. Verifies the schema + scoring round-trip end-to-end
 * without sending mail.
 *
 *   node --env-file=.env scripts/pipeline-smoke.mjs
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const today = new Date();
today.setUTCHours(0, 0, 0, 0);

const tag = `smoke-${Date.now()}`;
const subscriberEmail = `${tag}@oneread.test`;
const articleA = {
  url: `https://example.test/${tag}/ai`,
  title: "How small language models are quietly winning",
  sourceName: "Stratechery",
  sourceLanguage: "English",
  topic: "artificial-intelligence",
  subtopics: ["llms", "ai-products"],
  qualityScore: 0.85,
  usefulnessScore: 0.78,
  morningReadScore: 0.82,
  rawExcerpt:
    "Smaller, faster models are reshaping the economics of AI products by trading raw capability for latency, cost, and developer ergonomics.",
  reasonForSelection: "Strong original argument backed by recent product data.",
};
const articleB = {
  url: `https://example.test/${tag}/design`,
  title: "The quiet return of the editorial layout",
  sourceName: "Sidebar",
  sourceLanguage: "English",
  topic: "design",
  subtopics: ["product-design", "visual-design"],
  qualityScore: 0.72,
  usefulnessScore: 0.7,
  morningReadScore: 0.8,
  rawExcerpt:
    "After a decade of dashboard sprawl, a quieter aesthetic is back: serif headlines, real text, room to breathe.",
  reasonForSelection: "Useful, well-argued, light editorial read.",
};

try {
  console.log("Seeding articles + subscriber…");
  await prisma.article.create({ data: articleA });
  await prisma.article.create({ data: articleB });
  await prisma.subscriber.create({
    data: {
      email: subscriberEmail,
      interests: ["Artificial Intelligence", "Design"],
      primaryInterest: "artificial-intelligence",
      secondaryInterests: ["design"],
      sourceLanguage: "Any",
      summaryLanguage: "English",
      status: "ACTIVE",
    },
  });

  console.log("Running pipeline (dry-run)…");
  // Step 2 — pick best per (topic, sourceLanguage).
  const since = new Date(today.getTime() - 48 * 60 * 60 * 1000);
  const candidates = await prisma.article.findMany({
    where: { ingestedAt: { gte: since }, qualityScore: { gte: 0.6 } },
  });
  const buckets = new Map();
  for (const a of candidates) {
    const key = `${a.topic}::${a.sourceLanguage}`;
    const rank =
      0.5 * a.qualityScore + 0.3 * a.usefulnessScore + 0.2 * a.morningReadScore;
    const cur = buckets.get(key);
    if (!cur || rank > cur.rank) buckets.set(key, { article: a, rank });
  }
  for (const { article, rank } of buckets.values()) {
    await prisma.topicDailyPick.upsert({
      where: {
        date_topic_sourceLanguage: {
          date: today,
          topic: article.topic,
          sourceLanguage: article.sourceLanguage,
        },
      },
      update: {},
      create: {
        date: today,
        topic: article.topic,
        subtopics: article.subtopics,
        sourceLanguage: article.sourceLanguage,
        articleId: article.id,
        articleTitle: article.title,
        sourceName: article.sourceName,
        score: Math.round(rank * 1000) / 1000,
        reasonForSelection: article.reasonForSelection,
        status: "READY",
      },
    });
  }

  const picks = await prisma.topicDailyPick.findMany({
    where: { date: today },
    orderBy: { topic: "asc" },
  });
  console.log(`\n— TopicDailyPick rows for ${today.toISOString().slice(0, 10)} —`);
  for (const p of picks) {
    console.log(
      `  · ${p.topic.padEnd(28)}  ${p.sourceLanguage.padEnd(8)}  score=${p.score}  status=${p.status}`,
    );
    console.log(`      "${p.articleTitle}" — ${p.sourceName}`);
  }

  console.log("\nCleaning up smoke data…");
  // Cleanup is FK-cascade-aware: deleting Article cascades into picks and sends.
  await prisma.subscriber.delete({ where: { email: subscriberEmail } });
  await prisma.article.deleteMany({
    where: { url: { in: [articleA.url, articleB.url] } },
  });

  console.log("✓ pipeline smoke test passed");
} finally {
  await prisma.$disconnect();
}
