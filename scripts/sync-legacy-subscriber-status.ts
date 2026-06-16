/**
 * Syncs the legacy Subscriber.status from ProductSubscription access state.
 *
 * The legacy table is still used by older pipeline/admin reads, but access is
 * decided by ProductSubscription + eligibility. This keeps the legacy status
 * from saying ACTIVE for users who only saved preferences and still need Polar
 * checkout.
 *
 * Dry-run:
 *   node --import tsx --env-file=.env scripts/sync-legacy-subscriber-status.ts --dry-run
 *
 * Apply:
 *   node --import tsx --env-file=.env scripts/sync-legacy-subscriber-status.ts
 */
import { prisma } from "../lib/prisma";
import { ONE_ARTICLE_PRODUCT_KEY } from "../lib/options";
import { evaluateEligibility } from "../lib/subscriptions";

const dryRun = process.argv.includes("--dry-run");

async function main() {
  const subs = await prisma.productSubscription.findMany({
    where: { productKey: ONE_ARTICLE_PRODUCT_KEY },
    include: { contact: true, preferences: true },
    orderBy: { createdAt: "asc" },
  });

  const updates: Array<{ email: string; from: string; to: string; reason: string }> = [];

  for (const sub of subs) {
    const subscriber = await prisma.subscriber.findUnique({
      where: { email: sub.contact.email },
      select: { status: true },
    });
    if (!subscriber) continue;

    const eligibility = evaluateEligibility(sub);
    const nextStatus = eligibility.allowed ? "ACTIVE" : sub.status;
    if (subscriber.status !== nextStatus) {
      updates.push({
        email: sub.contact.email,
        from: subscriber.status,
        to: nextStatus,
        reason: eligibility.reason,
      });
    }
  }

  console.log("=== sync-legacy-subscriber-status ===");
  console.log(`mode: ${dryRun ? "dry-run" : "apply"}`);
  console.log(`updates: ${updates.length}`);
  for (const update of updates) {
    console.log(`${update.email}: ${update.from} -> ${update.to} (${update.reason})`);
  }

  if (!dryRun) {
    for (const update of updates) {
      await prisma.subscriber.update({
        where: { email: update.email },
        data: { status: update.to, subscribedAt: update.to === "ACTIVE" ? undefined : null },
      });
    }
  }
}

main()
  .catch((err) => {
    console.error("ERR", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
