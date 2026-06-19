import { runOneLingoDailyPipeline } from "../lib/lingo/pipeline";
import { prisma } from "../lib/prisma";

async function main() {
  const dateArg = process.argv.find((arg) => arg.startsWith("--date="));
  const segmentArg = process.argv.find((arg) => arg.startsWith("--segment="));
  const date = dateArg ? new Date(`${dateArg.slice("--date=".length)}T00:00:00Z`) : undefined;
  const segmentKey = segmentArg ? segmentArg.slice("--segment=".length) : undefined;
  const result = await runOneLingoDailyPipeline({
    date,
    segmentKey,
    dryRun: true,
    requireApproval: process.argv.includes("--require-approval"),
    send: async () => ({}),
  });
  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((err) => {
    console.error("[lingo-dry-run] failed:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
