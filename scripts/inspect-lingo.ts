import { getLingoOverviewMetrics } from "../lib/admin/lingo-queries";
import { lingoBillingConfigured, lingoCronEnabled, lingoDryRunForced, lingoRequireApproval } from "../lib/lingo/config";
import { prisma } from "../lib/prisma";

async function main() {
  const metrics = await getLingoOverviewMetrics();
  console.log(JSON.stringify({
    config: {
      billingConfigured: lingoBillingConfigured(),
      cronEnabled: lingoCronEnabled(),
      dryRunForced: lingoDryRunForced(),
      requireApproval: lingoRequireApproval(),
    },
    metrics,
  }, null, 2));
}

main()
  .catch((err) => {
    console.error("[inspect-lingo] failed:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
