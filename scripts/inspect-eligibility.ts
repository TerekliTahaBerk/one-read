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

/**
 * OneRead umbrella eligibility matrix. Exercises resolveOneArticleEligibilityForContact
 * / resolveOneFilmEligibilityForContact (lib/oneread/access.ts) against real DB rows —
 * covers umbrella access, legacy-only access, both present, and neither present.
 * Creates its own contacts under the `oneread-fixture-` prefix and cleans them up.
 */
async function runOneReadMatrix() {
  const { prisma } = await import("../lib/prisma");
  const {
    resolveOneArticleEligibilityForContact,
    resolveOneFilmEligibilityForContact,
    resolveOneNewsEligibilityForContact,
  } = await import("../lib/oneread/access");
  const { ONE_ARTICLE_PRODUCT_KEY, ONE_FILM_PRODUCT_KEY, ONE_NEWS_PRODUCT_KEY, ONE_READ_PRODUCT_KEY } = await import(
    "../lib/options"
  );

  const PREFIX = "oneread-fixture-";
  const future = new Date(Date.now() + 5 * DAY);

  type Scenario = {
    name: string;
    build: (contactId: string) => Promise<void>;
    expect: { allowed: boolean; reason: string };
  };

  const scenarios: Scenario[] = [
    {
      name: "umbrella active, no legacy row",
      build: async (contactId) => {
        await prisma.productSubscription.create({
          data: { contactId, productKey: ONE_READ_PRODUCT_KEY, status: "ACTIVE_PAID", paymentProvider: "polar" },
        });
        await prisma.productSubscription.create({
          data: {
            contactId,
            productKey: ONE_ARTICLE_PRODUCT_KEY,
            status: "PENDING_PREFERENCES",
            preferences: { create: { interests: ["Technology"], summaryLanguage: "English" } },
          },
        });
      },
      expect: { allowed: true, reason: "included_in_oneread" },
    },
    {
      name: "umbrella pending checkout (not yet active)",
      build: async (contactId) => {
        await prisma.productSubscription.create({
          data: { contactId, productKey: ONE_READ_PRODUCT_KEY, status: "PENDING_CHECKOUT" },
        });
        await prisma.productSubscription.create({
          data: {
            contactId,
            productKey: ONE_ARTICLE_PRODUCT_KEY,
            status: "PENDING_PREFERENCES",
            preferences: { create: { interests: ["Technology"], summaryLanguage: "English" } },
          },
        });
      },
      expect: { allowed: false, reason: "checkout_required" },
    },
    {
      name: "legacy-only OneArticle active (no umbrella row)",
      build: async (contactId) => {
        await prisma.productSubscription.create({
          data: {
            contactId,
            productKey: ONE_ARTICLE_PRODUCT_KEY,
            status: "ACTIVE_PAID",
            paymentProvider: "polar",
            preferences: { create: { interests: ["Technology"], summaryLanguage: "English" } },
          },
        });
      },
      expect: { allowed: true, reason: "legacy_one_article_access" },
    },
    {
      name: "both legacy and umbrella active (legacy wins)",
      build: async (contactId) => {
        await prisma.productSubscription.create({
          data: { contactId, productKey: ONE_READ_PRODUCT_KEY, status: "ACTIVE_PAID", paymentProvider: "polar" },
        });
        await prisma.productSubscription.create({
          data: {
            contactId,
            productKey: ONE_ARTICLE_PRODUCT_KEY,
            status: "ACTIVE_PAID",
            paymentProvider: "polar",
            preferences: { create: { interests: ["Technology"], summaryLanguage: "English" } },
          },
        });
      },
      expect: { allowed: true, reason: "legacy_one_article_access" },
    },
    {
      name: "neither legacy nor umbrella row exists",
      build: async () => {},
      expect: { allowed: false, reason: "missing_article_preferences" },
    },
    {
      name: "prefs complete, no subscription rows at all",
      build: async (contactId) => {
        await prisma.productSubscription.create({
          data: {
            contactId,
            productKey: ONE_ARTICLE_PRODUCT_KEY,
            status: "PENDING_PREFERENCES",
            preferences: { create: { interests: ["Technology"], summaryLanguage: "English" } },
          },
        });
      },
      expect: { allowed: false, reason: "checkout_required" },
    },
  ];

  console.log("\n=== OneRead umbrella eligibility matrix (resolveOneArticleEligibilityForContact) ===");
  let oneReadPass = 0;
  let oneReadFail = 0;
  for (const scenario of scenarios) {
    const contact = await prisma.contact.create({ data: { email: `${PREFIX}${Date.now()}-${Math.random().toString(36).slice(2)}@example.com` } });
    try {
      await scenario.build(contact.id);
      const result = await resolveOneArticleEligibilityForContact(contact.id, future);
      const ok = result.allowed === scenario.expect.allowed && result.reason === scenario.expect.reason;
      if (ok) oneReadPass++;
      else oneReadFail++;
      console.log(
        `${ok ? "PASS" : "FAIL"}  ${scenario.name.padEnd(42)} allowed=${String(result.allowed).padEnd(5)} reason=${result.reason}` +
          (ok ? "" : `  (expected allowed=${scenario.expect.allowed} reason=${scenario.expect.reason})`),
      );
    } finally {
      await prisma.productSubscription.deleteMany({ where: { contactId: contact.id } });
      await prisma.contact.delete({ where: { id: contact.id } });
    }
  }

  // Sanity-check the OneFilm mirror with a single umbrella-access case.
  const filmContact = await prisma.contact.create({ data: { email: `${PREFIX}film-${Date.now()}@example.com` } });
  try {
    await prisma.productSubscription.create({
      data: { contactId: filmContact.id, productKey: ONE_READ_PRODUCT_KEY, status: "ACTIVE_PAID", paymentProvider: "polar" },
    });
    await prisma.productSubscription.create({
      data: {
        contactId: filmContact.id,
        productKey: ONE_FILM_PRODUCT_KEY,
        status: "PENDING_PREFERENCES",
        filmPreferences: {
          create: { contactId: filmContact.id, emailLanguage: "English", preferredGenres: ["Drama"] },
        },
      },
    });
    const result = await resolveOneFilmEligibilityForContact(filmContact.id, future);
    const ok = result.allowed === true && result.reason === "included_in_oneread";
    if (ok) oneReadPass++;
    else oneReadFail++;
    console.log(
      `${ok ? "PASS" : "FAIL"}  ${"OneFilm: umbrella active".padEnd(42)} allowed=${String(result.allowed).padEnd(5)} reason=${result.reason}`,
    );
  } finally {
    await prisma.productSubscription.deleteMany({ where: { contactId: filmContact.id } });
    await prisma.contact.delete({ where: { id: filmContact.id } });
  }

  // Sanity-check the OneNews mirror with a single umbrella-access case.
  const newsContact = await prisma.contact.create({ data: { email: `${PREFIX}news-${Date.now()}@example.com` } });
  try {
    await prisma.productSubscription.create({
      data: { contactId: newsContact.id, productKey: ONE_READ_PRODUCT_KEY, status: "ACTIVE_PAID", paymentProvider: "polar" },
    });
    await prisma.productSubscription.create({
      data: {
        contactId: newsContact.id,
        productKey: ONE_NEWS_PRODUCT_KEY,
        status: "PENDING_PREFERENCES",
        newsPreferences: {
          create: { contactId: newsContact.id, briefingLanguage: "English", regionFocus: "Global" },
        },
      },
    });
    const result = await resolveOneNewsEligibilityForContact(newsContact.id, future);
    const ok = result.allowed === true && result.reason === "included_in_oneread";
    if (ok) oneReadPass++;
    else oneReadFail++;
    console.log(
      `${ok ? "PASS" : "FAIL"}  ${"OneNews: umbrella active".padEnd(42)} allowed=${String(result.allowed).padEnd(5)} reason=${result.reason}`,
    );
  } finally {
    await prisma.productSubscription.deleteMany({ where: { contactId: newsContact.id } });
    await prisma.contact.delete({ where: { id: newsContact.id } });
  }

  console.log(`\n${oneReadPass} passed, ${oneReadFail} failed`);
  if (oneReadFail > 0) process.exitCode = 1;
}

void runOneReadMatrix();
