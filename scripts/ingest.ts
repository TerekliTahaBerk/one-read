/**
 * OneRead — direct ingestion runner (no dev server, no email).
 *
 * Exercises the real production code path:
 *   1. `ingestCandidates(date, [rssSource])` — fetch RSS feeds, normalize
 *      + dedupe URLs, persist new Article rows.
 *   2. `extractAndScorePendingArticles()` — readability extract + score
 *      every PENDING article (heuristic scorer when no AI_PROVIDER is set).
 *
 * It never sends email. Use it to populate the Article table locally.
 *
 * Usage:
 *   npm run ingest             # ingest + extract + score
 *   npm run ingest -- --no-score   # ingest only (skip extract+score)
 *
 * Run with the env file:
 *   node --import tsx --env-file=.env scripts/ingest.ts
 * (the npm script below already wires this up).
 */

import { rssSource } from "../lib/rss-source";
import { ingestCandidates } from "../lib/ingest";
import { extractAndScorePendingArticles } from "../lib/scorer";
import { prisma } from "../lib/prisma";

async function main() {
  const noScore = process.argv.includes("--no-score");
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);

  console.log(`[ingest] ▶ date=${date.toISOString().slice(0, 10)} score=${!noScore}`);

  const t0 = Date.now();
  const ingested = await ingestCandidates(date, [rssSource]);
  console.log(`[ingest] · persisted ${ingested.length} new article(s) in ${Date.now() - t0}ms`);

  if (!noScore) {
    const t1 = Date.now();
    const r = await extractAndScorePendingArticles();
    console.log(
      `[ingest] · extract+score  total=${r.total} scored=${r.scored} rejected=${r.rejected} failed=${r.failed} in ${Date.now() - t1}ms`,
    );
  }

  // Per-source observability snapshot.
  const sources = await prisma.source.findMany({
    where: { active: true },
    select: { slug: true, lastError: true, lastFetchedAt: true },
    orderBy: { slug: "asc" },
  });
  const failed = sources.filter((s) => s.lastError);
  console.log(
    `[ingest] · sources active=${sources.length} failed=${failed.length}`,
  );
  for (const s of failed) {
    console.log(`[ingest]    ✗ ${s.slug}: ${(s.lastError ?? "").slice(0, 120)}`);
  }

  const total = await prisma.article.count();
  console.log(`[ingest] ✓ done — Article table now holds ${total} row(s)`);
}

main()
  .catch((err) => {
    console.error("[ingest] failed:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
