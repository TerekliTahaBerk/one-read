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
 *   npm run dry-run                 # full pipeline incl. RSS fetch
 *   npm run dry-run -- --skip-ingest  # skip network ingest, use existing pool
 */

import { runDailyPipeline } from "../lib/pipeline";
import { prisma } from "../lib/prisma";

async function main() {
  const skipIngest = process.argv.includes("--skip-ingest");
  const result = await runDailyPipeline({ dryRun: true, skipIngest });
  console.log("\n[dry-run] PipelineResult JSON:");
  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((err) => {
    console.error("[dry-run] failed:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
