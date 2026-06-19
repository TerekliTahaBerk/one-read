import { getNewsOverviewMetrics } from "../lib/admin/news-queries";
import {
  newsBillingConfigured,
  newsCronEnabled,
  newsDryRunForced,
  newsRequireApproval,
  newsSourceMode,
} from "../lib/news/config";
import { prisma } from "../lib/prisma";

async function main() {
  const metrics = await getNewsOverviewMetrics();
  console.log(
    JSON.stringify(
      {
        config: {
          billingConfigured: newsBillingConfigured(),
          cronEnabled: newsCronEnabled(),
          dryRunForced: newsDryRunForced(),
          requireApproval: newsRequireApproval(),
          sourceMode: newsSourceMode(),
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
    console.error("[inspect-news] failed:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
