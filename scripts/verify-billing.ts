/**
 * Phase 5 mock-billing lifecycle verification. Operates on the mock-fixture-*
 * rows (run `npm run mock:billing-fixtures` first). Asserts the test matrix and
 * prints PASS/FAIL. No real provider, no real email.
 */
import { prisma } from "../lib/prisma";
import { findOneArticleSubscription, resolveSubscribeState } from "../lib/subscriptions";
import { MockBillingProvider, completeMockCheckout, addInterval, mockCancelAtPeriodEnd, mockResume, mockPaymentFailed, mockPaymentRecovered } from "../lib/billing/mock";
import { evaluateEligibility } from "../lib/subscriptions";

const P = "mock-fixture-";
let pass = 0, fail = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) pass++;
  else fail++;
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${cond ? "" : "  <<< " + detail}`);
}
const sameDay = (a: Date | null, b: Date | null) =>
  !!a && !!b && a.toISOString().slice(0, 10) === b.toISOString().slice(0, 10);

async function get(slug: string) {
  return findOneArticleSubscription(`${P}${slug}@example.com`);
}

async function main() {
  const provider = new MockBillingProvider();

  // 1. Trialing subscribes monthly → period begins at trialEndsAt.
  const trialing = await get("trialing");
  const trialEnds = trialing!.trialEndsAt!;
  await completeMockCheckout(`${P}trialing@example.com`, "monthly");
  const t1 = await get("trialing");
  check("1 trialing→monthly: ACTIVE_PAID", t1!.status === "ACTIVE_PAID", t1!.status);
  check("1 plan monthly", t1!.plan === "monthly");
  check("1 periodStart = trialEndsAt", sameDay(t1!.currentPeriodStart, trialEnds), `${t1!.currentPeriodStart}`);
  check("1 periodEnd = trialEndsAt + 1mo", sameDay(t1!.currentPeriodEnd, addInterval(trialEnds, "monthly")));
  check("1 eligible", evaluateEligibility(t1!).allowed);

  // 2. Trial-expired subscribes annual → period begins now.
  const now = new Date();
  await completeMockCheckout(`${P}trial-expired@example.com`, "annual");
  const t2 = await get("trial-expired");
  check("2 trial-expired→annual: ACTIVE_PAID", t2!.status === "ACTIVE_PAID");
  check("2 plan annual", t2!.plan === "annual");
  check("2 periodStart ~ now", sameDay(t2!.currentPeriodStart, now), `${t2!.currentPeriodStart}`);
  check("2 periodEnd ~ now + 1yr", sameDay(t2!.currentPeriodEnd, addInterval(now, "annual")));
  check("2 eligible", evaluateEligibility(t2!).allowed);

  // 3. Active paid lookup + portal.
  const s3 = await resolveSubscribeState(`${P}paid-monthly@example.com`);
  check("3 active_paid lookup", s3.state === "active_paid", s3.state);
  const portal = await provider.createBillingPortalSession(`${P}paid-monthly@example.com`);
  check("3 portal url is mock-portal", portal.url.includes("/article/subscribe/mock-portal"));

  // 4. Cancel at period end (paid-monthly, period in future per fixture? it's now+1mo).
  await mockCancelAtPeriodEnd(`${P}paid-monthly@example.com`);
  const s4 = await get("paid-monthly");
  check("4 CANCELED", s4!.status === "CANCELED");
  check("4 cancelAtPeriodEnd true", s4!.cancelAtPeriodEnd === true);
  check("4 still eligible (period future)", evaluateEligibility(s4!).allowed);

  // 5. Resume before period end.
  await mockResume(`${P}paid-monthly@example.com`);
  const s5 = await get("paid-monthly");
  check("5 resumed ACTIVE_PAID", s5!.status === "ACTIVE_PAID");
  check("5 cancelAtPeriodEnd false", s5!.cancelAtPeriodEnd === false);

  // 6. Payment failed.
  await mockPaymentFailed(`${P}paid-monthly@example.com`);
  const s6 = await get("paid-monthly");
  check("6 PAST_DUE", s6!.status === "PAST_DUE");
  check("6 pastDueAt set", s6!.pastDueAt != null);

  // 7. Payment recovered.
  await mockPaymentRecovered(`${P}paid-monthly@example.com`);
  const s7 = await get("paid-monthly");
  check("7 recovered ACTIVE_PAID", s7!.status === "ACTIVE_PAID");
  check("7 pastDueAt cleared", s7!.pastDueAt == null);

  // 8. Email paused paid user.
  const s8 = await resolveSubscribeState(`${P}email-paused@example.com`);
  check("8 lookup active_email_paused", s8.state === "active_email_paused", s8.state);
  const e8 = evaluateEligibility((await get("email-paused"))!);
  check("8 eligibility denied email_unsubscribed", !e8.allowed && e8.reason === "email_unsubscribed", e8.reason);

  // 9. Duplicate checkout for active paid → already_active.
  const c9 = await provider.createCheckoutSession({ email: `${P}paid-annual@example.com`, plan: "monthly" });
  check("9 duplicate checkout → already_active", c9.kind === "already_active", c9.kind);
  const subsForEmail = await prisma.productSubscription.count({ where: { contact: { email: `${P}paid-annual@example.com` } } });
  check("9 no duplicate subscription", subsForEmail === 1, `count=${subsForEmail}`);

  // Checkout guards: needs_trial / needs_setup.
  const cTrial = await provider.createCheckoutSession({ email: "nobody-xyz@example.com", plan: "monthly" });
  check("checkout needs_trial for unknown", cTrial.kind === "needs_trial", cTrial.kind);

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error("ERR", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
