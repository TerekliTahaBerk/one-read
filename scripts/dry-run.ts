/**
 * One Read — local dry-run of the daily pipeline (no server, no email).
 *
 * Runs runDailyPipeline({ dryRun: true }): ingest → score → pick →
 * summarize → map deliveries, but never sends. Prints the full
 * PipelineResult JSON (sources attempted, articles ingested, demo/manual
 * count, rejections, picks, summaries, subscribers mapped/skipped + why,
 * emails that would be sent).
 *
 * Usage:
 *   npm run dry-run                          # full pipeline incl. RSS fetch
 *   npm run dry-run -- --skip-ingest         # skip network ingest, use pool
 *   npm run dry-run -- --skip-ingest --demo  # dev preview thresholds (relaxed)
 *
 * --demo applies relaxed DEMO_* thresholds (dev only) so demo/manual
 * articles flow through to picks/summaries. Production thresholds are never
 * changed, and no real email is ever sent in a dry run.
 */

import { runDailyPipeline } from "../lib/pipeline";
import { prisma } from "../lib/prisma";

async function main() {
  const skipIngest = process.argv.includes("--skip-ingest");
  const demo = process.argv.includes("--demo");
  const result = await runDailyPipeline({ dryRun: true, skipIngest, demo });
  console.log("\n[dry-run] demo preview checklist:");
  console.log(`  demo mode enabled: ${result.demo.enabled ? "yes" : "no"}`);
  console.log(
    `  production thresholds unchanged: article>=${result.demo.productionThresholds.minArticleScore} delivery>=${result.demo.productionThresholds.minDeliveryScore} summary>=${result.demo.productionThresholds.minSummaryConfidence}`,
  );
  console.log(
    `  preview thresholds used: article>=${result.demo.thresholdsUsed.minArticleScore} delivery>=${result.demo.thresholdsUsed.minDeliveryScore} summary>=${result.demo.thresholdsUsed.minSummaryConfidence}`,
  );
  console.log(`  topic picks from demo/manual articles: ${result.manualOrDemoPicks}`);
  console.log(`  summaries ready for email rendering: ${result.summaries.ready}`);
  console.log(`  emails that would be rendered: ${result.sends.total}`);
  console.log(`  real emails sent: ${result.sends.sent} (dry-run never sends)`);
  console.log("\n[dry-run] PipelineResult JSON:");
  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((err) => {
    console.error("[dry-run] failed:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
