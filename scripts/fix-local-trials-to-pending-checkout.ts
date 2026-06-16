/**
 * Converts local-only trial rows to PENDING_CHECKOUT after Polar became the
 * source of truth for trial/paid access.
 *
 * Dry-run:
 *   npx tsx scripts/fix-local-trials-to-pending-checkout.ts --dry-run
 *
 * Apply:
 *   npx tsx scripts/fix-local-trials-to-pending-checkout.ts
 */
import { prisma } from "../lib/prisma";
import { ONE_ARTICLE_PRODUCT_KEY } from "../lib/options";

const dryRun = process.argv.includes("--dry-run");

type StatusCounts = Record<string, number>;

async function statusCounts(): Promise<StatusCounts> {
  const rows = await prisma.productSubscription.groupBy({
    by: ["status"],
    where: { productKey: ONE_ARTICLE_PRODUCT_KEY },
    _count: { _all: true },
  });
  return Object.fromEntries(rows.map((r) => [r.status, r._count._all]));
}

async function main() {
  const before = await statusCounts();
  const trialing = await prisma.productSubscription.findMany({
    where: {
      productKey: ONE_ARTICLE_PRODUCT_KEY,
      status: "TRIALING",
    },
    include: { contact: { select: { email: true } }, preferences: true },
    orderBy: { createdAt: "asc" },
  });

  const skipped = {
    adminOverride: 0,
    providerConfirmed: 0,
    missingPreferences: 0,
  };
  const candidates = [];

  for (const sub of trialing) {
    const hasProvider =
      Boolean(sub.paymentProvider) ||
      Boolean(sub.providerCustomerId) ||
      Boolean(sub.providerSubscriptionId) ||
      Boolean(sub.providerCheckoutSessionId);

    if (sub.adminOverride || sub.status === "ADMIN_OVERRIDE") {
      skipped.adminOverride++;
      continue;
    }
    if (hasProvider) {
      skipped.providerConfirmed++;
      continue;
    }
    if (!sub.preferences || sub.preferences.interests.length === 0 || !sub.preferences.summaryLanguage) {
      skipped.missingPreferences++;
      continue;
    }

    candidates.push(sub);
  }

  console.log("=== fix-local-trials-to-pending-checkout ===");
  console.log(`mode: ${dryRun ? "dry-run" : "apply"}`);
  console.log("before status counts:", before);
  console.log(`trialing rows scanned: ${trialing.length}`);
  console.log(`candidates found: ${candidates.length}`);
  console.log(`skipped admin overrides: ${skipped.adminOverride}`);
  console.log(`skipped provider-confirmed rows: ${skipped.providerConfirmed}`);
  console.log(`skipped missing/incomplete preferences: ${skipped.missingPreferences}`);

  for (const sub of candidates) {
    console.log(
      `candidate ${sub.id} ${sub.contact.email} trialEndsAt=${sub.trialEndsAt?.toISOString() ?? "null"}`,
    );
  }

  let updated = 0;
  if (!dryRun && candidates.length > 0) {
    const result = await prisma.productSubscription.updateMany({
      where: { id: { in: candidates.map((s) => s.id) } },
      data: {
        status: "PENDING_CHECKOUT",
        trialStartedAt: null,
        trialEndsAt: null,
        trialUsedAt: null,
      },
    });
    updated = result.count;
  }

  const after = dryRun ? before : await statusCounts();
  console.log(`updated rows: ${updated}`);
  console.log("after status counts:", after);
}

main()
  .catch((err) => {
    console.error("ERR", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
