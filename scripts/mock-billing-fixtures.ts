/**
 * Creates clearly-marked mock test subscriptions covering every billing state,
 * so the lifecycle / lookup / eligibility can be exercised end to end.
 *
 *   npm run mock:billing-fixtures           # create fixtures
 *   npm run mock:billing-fixtures -- --clean # delete all fixtures
 *
 * All fixture emails use the prefix `mock-fixture-` and are easy to remove.
 * Refuses to run in production unless MOCK_BILLING_PREVIEW=true.
 */
import { prisma } from "../lib/prisma";
import { ONE_ARTICLE_PRODUCT_KEY } from "../lib/options";
import { addInterval, isMockAllowed } from "../lib/billing/mock";

const PREFIX = "mock-fixture-";
const now = new Date();
const DAY = 86400000;
const future = new Date(now.getTime() + 5 * DAY);
const past = new Date(now.getTime() - 5 * DAY);

type Fix = {
  slug: string;
  data: Record<string, unknown>;
  prefs?: boolean;
};

const FIXTURES: Fix[] = [
  { slug: "trialing", data: { status: "TRIALING", paymentProvider: "mock", trialStartedAt: now, trialEndsAt: future }, prefs: true },
  { slug: "trial-expired", data: { status: "TRIAL_EXPIRED", trialStartedAt: past, trialEndsAt: past }, prefs: true },
  {
    slug: "paid-monthly",
    data: { status: "ACTIVE_PAID", paymentProvider: "mock", plan: "monthly", paidAt: now, currentPeriodStart: now, currentPeriodEnd: addInterval(now, "monthly") },
    prefs: true,
  },
  {
    slug: "paid-annual",
    data: { status: "ACTIVE_PAID", paymentProvider: "mock", plan: "annual", paidAt: now, currentPeriodStart: now, currentPeriodEnd: addInterval(now, "annual") },
    prefs: true,
  },
  {
    slug: "canceled-active",
    data: { status: "CANCELED", paymentProvider: "mock", plan: "monthly", cancelAtPeriodEnd: true, canceledAt: now, currentPeriodStart: past, currentPeriodEnd: future },
    prefs: true,
  },
  {
    slug: "expired",
    data: { status: "EXPIRED", paymentProvider: "mock", plan: "monthly", currentPeriodStart: past, currentPeriodEnd: past },
    prefs: true,
  },
  {
    slug: "past-due",
    data: { status: "PAST_DUE", paymentProvider: "mock", plan: "monthly", pastDueAt: now, currentPeriodStart: past, currentPeriodEnd: future },
    prefs: true,
  },
  {
    slug: "email-paused",
    data: { status: "ACTIVE_PAID", paymentProvider: "mock", plan: "monthly", emailDeliveryStatus: "UNSUBSCRIBED", paidAt: now, currentPeriodStart: now, currentPeriodEnd: addInterval(now, "monthly") },
    prefs: true,
  },
];

async function clean() {
  const r = await prisma.contact.deleteMany({ where: { email: { startsWith: PREFIX } } });
  console.log(`[fixtures] removed ${r.count} fixture contacts (cascades subscriptions/prefs).`);
}

async function main() {
  if (!isMockAllowed()) {
    console.error("[fixtures] refusing to run: mock billing is not allowed in this environment.");
    process.exitCode = 1;
    return;
  }

  if (process.argv.includes("--clean")) {
    await clean();
    return;
  }

  await clean(); // idempotent: start fresh
  for (const f of FIXTURES) {
    const email = `${PREFIX}${f.slug}@example.com`;
    const contact = await prisma.contact.create({ data: { email } });
    const sub = await prisma.productSubscription.create({
      data: {
        contactId: contact.id,
        productKey: ONE_ARTICLE_PRODUCT_KEY,
        adminNote: "mock fixture",
        ...f.data,
      },
    });
    if (f.prefs) {
      await prisma.articlePreferences.create({
        data: { productSubscriptionId: sub.id, interests: ["Technology"], summaryLanguage: "English" },
      });
    }
    console.log(`[fixtures] ${email.padEnd(40)} -> ${f.data.status}`);
  }
  console.log(`\n[fixtures] created ${FIXTURES.length} fixtures. Remove with: npm run mock:billing-fixtures -- --clean`);
}

main()
  .catch((e) => {
    console.error("ERR", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
