// One Read — inspect rejected articles + rejected summaries.
//
// Pure @prisma/client; no dev server needed.
//
// Usage:
//   npm run inspect:rejected           # 30 most-recent rejected articles
//   npm run inspect:rejected -- 60     # show N
//
// Surfaces the rejection audit trail so you can see WHY content was
// dropped (paywall, too short, low confidence, promotional, no LLM, etc.).

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const limit = Number(process.argv[2]) || 30;

try {
  // --- Rejected articles ---
  const rejected = await prisma.article.findMany({
    where: { scoringStatus: "REJECTED" },
    orderBy: { ingestedAt: "desc" },
    take: limit,
    select: {
      title: true,
      sourceName: true,
      extractionConfidence: true,
      qualityScore: true,
      rejectionReason: true,
    },
  });
  const totalRejected = await prisma.article.count({
    where: { scoringStatus: "REJECTED" },
  });

  console.log(`\n=== Rejected articles — ${totalRejected} total, showing ${rejected.length} ===`);

  // Group reasons for a quick histogram.
  const reasonCounts = new Map();
  for (const a of rejected) {
    const key = (a.rejectionReason ?? "—").slice(0, 50);
    reasonCounts.set(key, (reasonCounts.get(key) ?? 0) + 1);
  }
  console.log("\nReason histogram (shown rows):");
  for (const [reason, n] of [...reasonCounts.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(3)} × ${reason}`);
  }

  console.log("\nRows:");
  for (const a of rejected) {
    const conf = a.extractionConfidence == null ? "  —" : a.extractionConfidence.toFixed(2);
    console.log(
      `  conf=${conf} q=${a.qualityScore?.toFixed(2) ?? "—"} ${a.sourceName} — ${a.title.slice(0, 65)}`,
    );
    console.log(`     ↳ ${a.rejectionReason ?? "(no reason recorded)"}`);
  }

  // --- Rejected summaries ---
  const rejSummaries = await prisma.summary.findMany({
    where: { status: "REJECTED" },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { pick: { select: { articleTitle: true } } },
  });
  console.log(`\n=== Rejected summaries — showing ${rejSummaries.length} ===`);
  for (const s of rejSummaries) {
    console.log(
      `  [${s.summaryLanguage}] conf=${s.confidence ?? "—"} gen=${s.generator ?? "—"} — ${s.pick.articleTitle.slice(0, 60)}`,
    );
    console.log(`     ↳ ${s.rejectionReason ?? "(no reason recorded)"}`);
  }
  console.log("");
} finally {
  await prisma.$disconnect();
}
