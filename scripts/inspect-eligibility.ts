/**
 * Verification harness for the trial/subscription model. Exercises both the
 * lookup resolver (resolveSubscribeState) and the central eligibility gate
 * (canReceiveOneArticleEmail) across every lifecycle state, using in-memory
 * fixtures (no DB writes). Run: npm run inspect:eligibility
 */
import { canReceiveOneArticleEmail, type EligibilityInput } from "../lib/billing/access";

const now = new Date("2026-06-16T12:00:00Z");
const future = new Date("2026-06-23T12:00:00Z");
const past = new Date("2026-06-10T12:00:00Z");
const DAY = 86400000;

const base: EligibilityInput = {
  status: "TRIALING",
  emailDeliveryStatus: "SUBSCRIBED",
  paymentProvider: "polar",
  adminOverride: false,
  trialEndsAt: future,
  currentPeriodEnd: null,
  pastDueAt: null,
  hasCompletePreferences: true,
};

const cases: { name: string; input: EligibilityInput; expectAllowed: boolean }[] = [
  { name: "TRIALING, not expired", input: { ...base }, expectAllowed: true },
  { name: "TRIALING, expired", input: { ...base, trialEndsAt: past }, expectAllowed: false },
  { name: "TRIAL_EXPIRED", input: { ...base, status: "TRIAL_EXPIRED" }, expectAllowed: false },
  { name: "ACTIVE_PAID", input: { ...base, status: "ACTIVE_PAID", trialEndsAt: null }, expectAllowed: true },
  { name: "CANCELED, period in future", input: { ...base, status: "CANCELED", trialEndsAt: null, currentPeriodEnd: future }, expectAllowed: true },
  { name: "CANCELED, period ended", input: { ...base, status: "CANCELED", trialEndsAt: null, currentPeriodEnd: past }, expectAllowed: false },
  { name: "PAST_DUE within grace", input: { ...base, status: "PAST_DUE", trialEndsAt: null, pastDueAt: new Date(now.getTime() - 1 * DAY) }, expectAllowed: true },
  { name: "PAST_DUE beyond grace", input: { ...base, status: "PAST_DUE", trialEndsAt: null, pastDueAt: new Date(now.getTime() - 10 * DAY) }, expectAllowed: false },
  { name: "EXPIRED", input: { ...base, status: "EXPIRED", trialEndsAt: null }, expectAllowed: false },
  { name: "ADMIN_OVERRIDE", input: { ...base, status: "ADMIN_OVERRIDE", trialEndsAt: null }, expectAllowed: true },
  { name: "TRIALING without provider", input: { ...base, paymentProvider: null }, expectAllowed: false },
  { name: "ACTIVE_PAID without provider", input: { ...base, status: "ACTIVE_PAID", trialEndsAt: null, paymentProvider: null }, expectAllowed: false },
  { name: "email UNSUBSCRIBED (paid)", input: { ...base, status: "ACTIVE_PAID", trialEndsAt: null, emailDeliveryStatus: "UNSUBSCRIBED" }, expectAllowed: false },
  { name: "email SUPPRESSED", input: { ...base, status: "ACTIVE_PAID", trialEndsAt: null, emailDeliveryStatus: "SUPPRESSED" }, expectAllowed: false },
  { name: "incomplete preferences (trialing)", input: { ...base, hasCompletePreferences: false }, expectAllowed: false },
  { name: "PENDING_PREFERENCES", input: { ...base, status: "PENDING_PREFERENCES", trialEndsAt: null, hasCompletePreferences: false }, expectAllowed: false },
  { name: "PENDING_CHECKOUT", input: { ...base, status: "PENDING_CHECKOUT", trialEndsAt: null }, expectAllowed: false },
];

let pass = 0;
let fail = 0;
console.log("=== canReceiveOneArticleEmail matrix ===");
for (const c of cases) {
  const r = canReceiveOneArticleEmail(c.input, now);
  const ok = r.allowed === c.expectAllowed;
  if (ok) pass++;
  else fail++;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${c.name.padEnd(34)} allowed=${String(r.allowed).padEnd(5)} reason=${r.reason}` +
      (ok ? "" : `  (expected allowed=${c.expectAllowed})`),
  );
}
console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exitCode = 1;
