import { getFilmOverviewMetrics } from "../lib/admin/film-queries";
import {
  filmBillingConfigured,
  filmCronEnabled,
  filmDryRunForced,
  filmRequireApproval,
  filmSourceMode,
} from "../lib/film/config";
import { prisma } from "../lib/prisma";

async function main() {
  const metrics = await getFilmOverviewMetrics();
  console.log(
    JSON.stringify(
      {
        config: {
          billingConfigured: filmBillingConfigured(),
          cronEnabled: filmCronEnabled(),
          dryRunForced: filmDryRunForced(),
          requireApproval: filmRequireApproval(),
          sourceMode: filmSourceMode(),
        },
        metrics,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((err) => {
    console.error("[inspect-film] failed:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
