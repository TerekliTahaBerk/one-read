/**
 * Idempotent OneArticle-only cutover backfill.
 *
 * - Ensures every OneRead billing contact has a one-article preference holder.
 * - Reuses a legacy Subscriber.summaryLanguage when available.
 * - Never invents a language and never changes billing/access state.
 * - Reports contacts that must choose a reading language before delivery.
 *
 * Usage:
 *   node --import tsx --env-file=.env scripts/backfill-one-article-language.ts
 *   node --import tsx --env-file=.env scripts/backfill-one-article-language.ts --dry-run
 */
import { prisma } from "../lib/prisma";
import {
  ONE_ARTICLE_PRODUCT_KEY,
  ONE_READ_PRODUCT_KEY,
  parseSummaryLanguage,
} from "../lib/options";

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const billingRows = await prisma.productSubscription.findMany({
    where: { productKey: ONE_READ_PRODUCT_KEY },
    include: { contact: { select: { id: true, email: true } } },
  });
  let holdersCreated = 0;
  let languagesBackfilled = 0;
  const missingLanguage: string[] = [];

  for (const billing of billingRows) {
    let holder = await prisma.productSubscription.findUnique({
      where: {
        contactId_productKey: {
          contactId: billing.contactId,
          productKey: ONE_ARTICLE_PRODUCT_KEY,
        },
      },
      include: { preferences: true },
    });
    if (!holder && !dryRun) {
      holder = await prisma.productSubscription.create({
        data: {
          contactId: billing.contactId,
          productKey: ONE_ARTICLE_PRODUCT_KEY,
          status: "PENDING_PREFERENCES",
        },
        include: { preferences: true },
      });
      holdersCreated++;
    } else if (!holder) {
      holdersCreated++;
    }

    if (holder?.preferences?.summaryLanguage) continue;
    const legacy = await prisma.subscriber.findUnique({
      where: { email: billing.contact.email },
      select: { summaryLanguage: true },
    });
    const legacyLanguage = parseSummaryLanguage(legacy?.summaryLanguage);
    if (legacyLanguage) {
      if (!dryRun) {
        if (!holder) throw new Error(`holder_missing_after_create:${billing.contactId}`);
        await prisma.articlePreferences.upsert({
          where: { productSubscriptionId: holder.id },
          update: { summaryLanguage: legacyLanguage },
          create: {
            productSubscriptionId: holder.id,
            interests: [],
            primaryInterest: null,
            secondaryInterests: [],
            sourceLanguage: "Any",
            summaryLanguage: legacyLanguage,
            recentlySentTopics: [],
            recentlySentArticleIds: [],
          },
        });
      }
      languagesBackfilled++;
    } else {
      missingLanguage.push(billing.contact.email);
    }
  }

  console.log(`[one-article-cutover] mode=${dryRun ? "dry-run" : "apply"}`);
  console.log(`[one-article-cutover] OneRead billing rows=${billingRows.length}`);
  console.log(`[one-article-cutover] holders created=${holdersCreated}`);
  console.log(`[one-article-cutover] languages backfilled=${languagesBackfilled}`);
  console.log(`[one-article-cutover] language required=${missingLanguage.length}`);
  for (const email of missingLanguage) console.log(`[one-article-cutover] needs-language ${email}`);
}

main()
  .catch((error) => {
    console.error("[one-article-cutover] failed", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
