// OneRead — inspect ingested articles + verify deduplication.
//
// Pure @prisma/client; no dev server needed.
//
// Usage:
//   npm run inspect:articles          # summary + 20 most-recent rows
//   npm run inspect:articles -- 50    # show N most-recent rows
//
// Verifies:
//   - how many articles exist, grouped by scoringStatus
//   - extraction-confidence distribution
//   - duplicate detection: any repeated url / canonicalUrl (should be 0)

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const limit = Number(process.argv[2]) || 20;

try {
  const total = await prisma.article.count();
  console.log(`\n=== Article table — ${total} row(s) ===\n`);

  // Counts by scoringStatus.
  const byStatus = await prisma.article.groupBy({
    by: ["scoringStatus"],
    _count: { _all: true },
  });
  console.log("By scoringStatus:");
  for (const r of byStatus) {
    console.log(`  ${r.scoringStatus.padEnd(10)} ${r._count._all}`);
  }

  // Extraction confidence buckets.
  const all = await prisma.article.findMany({
    select: { extractionConfidence: true },
  });
  const buckets = { none: 0, low: 0, mid: 0, high: 0 };
  for (const a of all) {
    const c = a.extractionConfidence;
    if (c == null) buckets.none++;
    else if (c < 0.45) buckets.low++;
    else if (c < 0.7) buckets.mid++;
    else buckets.high++;
  }
  console.log("\nExtraction confidence:");
  console.log(`  null        ${buckets.none}`);
  console.log(`  <0.45 (low) ${buckets.low}`);
  console.log(`  0.45–0.7    ${buckets.mid}`);
  console.log(`  >=0.7 (high)${buckets.high}`);

  // Dedup verification — group by url + canonicalUrl, report any dupes.
  const dupUrls = await prisma.$queryRaw`
    SELECT "url", COUNT(*) AS n FROM "Article" GROUP BY "url" HAVING COUNT(*) > 1`;
  const dupCanonical = await prisma.$queryRaw`
    SELECT "canonicalUrl", COUNT(*) AS n FROM "Article"
    WHERE "canonicalUrl" IS NOT NULL GROUP BY "canonicalUrl" HAVING COUNT(*) > 1`;
  console.log("\nDeduplication check:");
  console.log(`  duplicate url rows:          ${dupUrls.length}`);
  console.log(`  duplicate canonicalUrl rows: ${dupCanonical.length}`);
  if (dupUrls.length === 0 && dupCanonical.length === 0) {
    console.log("  ✓ no duplicates");
  }

  // Recent rows.
  const recent = await prisma.article.findMany({
    orderBy: { ingestedAt: "desc" },
    take: limit,
    select: {
      title: true,
      sourceName: true,
      topic: true,
      scoringStatus: true,
      extractionConfidence: true,
      qualityScore: true,
      rejectionReason: true,
    },
  });
  console.log(`\n=== ${recent.length} most-recent article(s) ===`);
  for (const a of recent) {
    const conf = a.extractionConfidence == null ? "  —" : a.extractionConfidence.toFixed(2);
    const q = a.qualityScore?.toFixed(2) ?? "—";
    console.log(
      `  [${a.scoringStatus.padEnd(8)}] conf=${conf} q=${q} ${a.sourceName} — ${a.title.slice(0, 70)}` +
        (a.rejectionReason ? `  (reject: ${a.rejectionReason.slice(0, 60)})` : ""),
    );
  }
  console.log("");
} finally {
  await prisma.$disconnect();
}
