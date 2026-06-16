/**
 * Verifies resolveSubscribeState across every lifecycle state. Creates
 * disposable fixtures (emails prefixed verify-lookup-), resolves each, then
 * deletes them. No effect on real subscribers.
 */
import { prisma } from "../lib/prisma";
import { resolveSubscribeState } from "../lib/subscriptions";
import { ONE_ARTICLE_PRODUCT_KEY } from "../lib/options";

const PREFIX = "verify-lookup-";
const now = new Date();
const DAY = 86400000;
const future = new Date(now.getTime() + 5 * DAY);
const past = new Date(now.getTime() - 5 * DAY);

type Fixture = {
  label: string;
  email: string;
  expect: string;
  data?: Record<string, unknown>;
  prefs?: boolean;
  noSub?: boolean;
};

const fixtures: Fixture[] = [
  { label: "no record", email: `${PREFIX}none@example.com`, expect: "new", noSub: true },
  { label: "incomplete", email: `${PREFIX}pending@example.com`, expect: "incomplete", data: { status: "PENDING_PREFERENCES" }, prefs: false },
  { label: "checkout needed", email: `${PREFIX}checkout@example.com`, expect: "checkout_needed", data: { status: "PENDING_CHECKOUT" }, prefs: true },
  { label: "local trial not confirmed", email: `${PREFIX}localtrial@example.com`, expect: "checkout_needed", data: { status: "TRIALING", trialEndsAt: future }, prefs: true },
  { label: "trial active", email: `${PREFIX}trialing@example.com`, expect: "trialing", data: { status: "TRIALING", paymentProvider: "polar", trialEndsAt: future }, prefs: true },
  { label: "trial expired (TRIALING+past)", email: `${PREFIX}trialexp@example.com`, expect: "trial_expired", data: { status: "TRIALING", paymentProvider: "polar", trialEndsAt: past }, prefs: true },
  { label: "active paid", email: `${PREFIX}paid@example.com`, expect: "active_paid", data: { status: "ACTIVE_PAID", paymentProvider: "polar" }, prefs: true },
  { label: "canceled, period active", email: `${PREFIX}cancel@example.com`, expect: "canceled_active", data: { status: "CANCELED", paymentProvider: "polar", currentPeriodEnd: future }, prefs: true },
  { label: "expired", email: `${PREFIX}expired@example.com`, expect: "expired", data: { status: "EXPIRED" }, prefs: true },
  { label: "past due", email: `${PREFIX}pastdue@example.com`, expect: "past_due", data: { status: "PAST_DUE", paymentProvider: "polar", pastDueAt: now }, prefs: true },
  { label: "email paused (paid)", email: `${PREFIX}paused@example.com`, expect: "active_email_paused", data: { status: "ACTIVE_PAID", paymentProvider: "polar", emailDeliveryStatus: "UNSUBSCRIBED" }, prefs: true },
  { label: "suppressed", email: `${PREFIX}suppressed@example.com`, expect: "suppressed", data: { status: "ACTIVE_PAID", paymentProvider: "polar", emailDeliveryStatus: "SUPPRESSED" }, prefs: true },
];

async function cleanup() {
  await prisma.contact.deleteMany({ where: { email: { startsWith: PREFIX } } });
}

async function main() {
  await cleanup();
  // Build fixtures.
  for (const f of fixtures) {
    if (f.noSub) continue;
    const contact = await prisma.contact.create({ data: { email: f.email } });
    const sub = await prisma.productSubscription.create({
      data: {
        contactId: contact.id,
        productKey: ONE_ARTICLE_PRODUCT_KEY,
        ...(f.data ?? {}),
      },
    });
    if (f.prefs) {
      await prisma.articlePreferences.create({
        data: { productSubscriptionId: sub.id, interests: ["Technology"], summaryLanguage: "English" },
      });
    }
  }

  let pass = 0;
  let fail = 0;
  console.log("=== resolveSubscribeState ===");
  for (const f of fixtures) {
    const r = await resolveSubscribeState(f.email, now);
    const ok = r.state === f.expect;
    if (ok) pass++;
    else fail++;
    const extra = r.daysLeft != null ? ` daysLeft=${r.daysLeft}` : r.periodEndsAt ? ` periodEndsAt=${r.periodEndsAt.slice(0, 10)}` : "";
    console.log(`${ok ? "PASS" : "FAIL"}  ${f.label.padEnd(28)} -> ${r.state}${extra}${ok ? "" : `  (expected ${f.expect})`}`);
  }
  console.log(`\n${pass} passed, ${fail} failed`);

  await cleanup();
  if (fail > 0) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error("ERR", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
