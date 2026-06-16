/**
 * OneRead — manual article scorer (no dev server, no email).
 *
 * Runs `extractAndScorePendingArticles()` over every PENDING article:
 * readability extract + LLM score (or heuristic in development). Persists
 * scores, topic classification, and rejection reasons; never sends email.
 *
 * Usage:
 *   npm run score              # score all PENDING (default limit)
 *   npm run score -- --limit 10
 *
 * Provider is chosen from AI_PROVIDER (openai|anthropic). With no provider
 * configured this uses the heuristic scorer in development only — in
 * production it rejects, by design.
 */

import { extractAndScorePendingArticles } from "../lib/scorer";
import { getLlmStatus } from "../lib/llm";
import { prisma } from "../lib/prisma";

async function main() {
  const limitArg = argValue("--limit");
  const limit = limitArg ? Number(limitArg) : undefined;

  const llm = getLlmStatus();
  console.log(
    `[score] provider=${llm.provider}/${llm.model} configured=${llm.configured} NODE_ENV=${process.env.NODE_ENV ?? "development"}`,
  );

  const pendingBefore = await prisma.article.count({
    where: { scoringStatus: "PENDING" },
  });
  console.log(`[score] PENDING before: ${pendingBefore}`);

  const t0 = Date.now();
  const r = await extractAndScorePendingArticles(limit ? { limit } : {});
  console.log(
    `[score] · total=${r.total} scored=${r.scored} rejected=${r.rejected} failed=${r.failed} in ${Date.now() - t0}ms`,
  );

  const byStatus = await prisma.article.groupBy({
    by: ["scoringStatus"],
    _count: { _all: true },
  });
  console.log("[score] Article table by scoringStatus:");
  for (const s of byStatus) {
    console.log(`[score]   ${s.scoringStatus.padEnd(10)} ${s._count._all}`);
  }
}

function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

main()
  .catch((err) => {
    console.error("[score] failed:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
