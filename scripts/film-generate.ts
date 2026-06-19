import { runOneFilmDailyPipeline } from "../lib/film/pipeline";
import { prisma } from "../lib/prisma";

/**
 * Generates (and persists) OneFilm issues for eligible segments without
 * sending. Grounded — segments with no catalog film are stored as NO_FILM and
 * never fabricated.
 */
async function main() {
  const dateArg = process.argv.find((arg) => arg.startsWith("--date="));
  const segmentArg = process.argv.find((arg) => arg.startsWith("--segment="));
  const date = dateArg ? new Date(`${dateArg.slice("--date=".length)}T00:00:00Z`) : undefined;
  const segmentKey = segmentArg ? segmentArg.slice("--segment=".length) : undefined;
  const result = await runOneFilmDailyPipeline({
    date,
    segmentKey,
    dryRun: true,
    requireApproval: false,
    send: async () => ({}),
  });
  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((err) => {
    console.error("[film-generate] failed:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
