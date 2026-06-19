import type { LingoPreferences, ProductSubscription } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ONE_LINGO_PRODUCT_KEY, isAlwaysSubscribed } from "@/lib/options";
import {
  canReceiveProductEmail,
  hasValidAccess,
  type EligibilityInput,
  type EligibilityResult,
} from "@/lib/billing/access";
import type { SubscribeLookupResult } from "@/lib/subscriptions";

/**
 * Data-access layer over Contact / ProductSubscription / LingoPreferences for
 * OneLingo. Mirrors `lib/subscriptions.ts` (OneArticle) so the pipeline, signup
 * routes, the subscribe lookup, and admin all read the OneLingo model the same
 * way. OneLingo and OneArticle never share a ProductSubscription row (each is
 * scoped to one productKey), so the two layers are fully independent.
 */

export type LingoSubscriptionWithPrefs = ProductSubscription & {
  lingoPreferences: LingoPreferences | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * OneLingo preferences are "complete" — enough to render a daily lesson — when
 * the learner has chosen a target language, a native/explanation language, and
 * a level. Goal/style/interests refine but are not strictly required.
 */
export function lingoPreferencesComplete(
  prefs: Pick<LingoPreferences, "targetLanguage" | "nativeLanguage" | "level"> | null,
): boolean {
  return Boolean(
    prefs && prefs.targetLanguage && prefs.nativeLanguage && prefs.level,
  );
}

/** Builds the structural input that `canReceiveProductEmail` expects. */
export function toLingoEligibilityInput(
  sub: LingoSubscriptionWithPrefs,
): EligibilityInput {
  return {
    status: sub.status,
    emailDeliveryStatus: sub.emailDeliveryStatus,
    paymentProvider: sub.paymentProvider,
    adminOverride: sub.adminOverride,
    trialEndsAt: sub.trialEndsAt,
    currentPeriodEnd: sub.currentPeriodEnd,
    pastDueAt: sub.pastDueAt,
    hasCompletePreferences: lingoPreferencesComplete(sub.lingoPreferences),
  };
}

/**
 * OneLingo eligibility. Wraps the shared `canReceiveProductEmail` but reports
 * the more specific `missing_language_preferences` reason when a learner has
 * started preferences yet is missing one of the core language fields.
 */
export function evaluateLingoEligibility(
  sub: LingoSubscriptionWithPrefs,
  now: Date = new Date(),
): EligibilityResult {
  const prefs = sub.lingoPreferences;
  if (
    prefs &&
    !(prefs.targetLanguage && prefs.nativeLanguage && prefs.level)
  ) {
    return { allowed: false, reason: "missing_language_preferences" };
  }
  return canReceiveProductEmail(toLingoEligibilityInput(sub), now);
}

/** Finds the OneLingo subscription for an email, or null. Email pre-parsed. */
export async function findOneLingoSubscription(
  email: string,
): Promise<LingoSubscriptionWithPrefs | null> {
  const contact = await prisma.contact.findUnique({
    where: { email },
    include: {
      subscriptions: {
        where: { productKey: ONE_LINGO_PRODUCT_KEY },
        include: { lingoPreferences: true },
        take: 1,
      },
    },
  });
  return contact?.subscriptions[0] ?? null;
}

/**
 * Ensures a Contact + OneLingo ProductSubscription exist for the email and
 * returns the subscription. Never duplicates a Contact. Founder /
 * always-subscribed emails are created as ADMIN_OVERRIDE. Creates no trial and
 * grants no access — Polar is the source of truth.
 */
export async function ensureOneLingoSubscription(
  email: string,
): Promise<LingoSubscriptionWithPrefs> {
  const override = isAlwaysSubscribed(email);
  const contact = await prisma.contact.upsert({
    where: { email },
    update: {},
    create: { email },
  });

  const existing = await prisma.productSubscription.findUnique({
    where: {
      contactId_productKey: {
        contactId: contact.id,
        productKey: ONE_LINGO_PRODUCT_KEY,
      },
    },
    include: { lingoPreferences: true },
  });
  if (existing) return existing;

  return prisma.productSubscription.create({
    data: {
      contactId: contact.id,
      productKey: ONE_LINGO_PRODUCT_KEY,
      status: override ? "ADMIN_OVERRIDE" : "PENDING_PREFERENCES",
      adminOverride: override,
      adminNote: override ? "always-subscribed (founder)" : null,
    },
    include: { lingoPreferences: true },
  });
}

/**
 * Builds an email → eligibility map for every OneLingo subscription. The daily
 * pipeline uses this as its single gate.
 */
export async function getOneLingoEligibilityByEmail(
  now: Date = new Date(),
): Promise<Map<string, EligibilityResult>> {
  const subs = await prisma.productSubscription.findMany({
    where: { productKey: ONE_LINGO_PRODUCT_KEY },
    include: { lingoPreferences: true, contact: { select: { email: true } } },
  });
  const map = new Map<string, EligibilityResult>();
  for (const sub of subs) {
    map.set(sub.contact.email, evaluateLingoEligibility(sub, now));
  }
  return map;
}

const dayDiffCeil = (from: Date, to: Date): number =>
  Math.max(0, Math.ceil((to.getTime() - from.getTime()) / DAY_MS));

function providerConfirmsSubscription(sub: LingoSubscriptionWithPrefs): boolean {
  if (sub.adminOverride) return true;
  if (sub.paymentProvider === "polar") return true;
  return sub.paymentProvider === "mock" && process.env.NODE_ENV !== "production";
}

/**
 * Resolves the subscribe-flow state for an email. Read-only; never mutates and
 * never exposes provider/billing identifiers. Reuses the OneArticle
 * `SubscribeState` union — the lifecycle is identical across products.
 */
export async function resolveLingoSubscribeState(
  email: string,
  now: Date = new Date(),
): Promise<SubscribeLookupResult> {
  const sub = await findOneLingoSubscription(email);
  if (!sub) return { state: "new" };

  if (sub.emailDeliveryStatus === "SUPPRESSED") return { state: "suppressed" };
  const providerConfirmed = providerConfirmsSubscription(sub);

  switch (sub.status) {
    case "PENDING_PREFERENCES":
      return { state: "incomplete" };
    case "PENDING_CHECKOUT":
      return { state: "checkout_needed" };
    case "TRIALING":
      if (!providerConfirmed) return { state: "checkout_needed" };
      if (sub.trialEndsAt && now < sub.trialEndsAt) {
        return { state: "trialing", daysLeft: dayDiffCeil(now, sub.trialEndsAt) };
      }
      return { state: "trial_expired" };
    case "TRIAL_EXPIRED":
      return { state: "trial_expired" };
    case "ACTIVE_PAID":
      if (!providerConfirmed) return { state: "checkout_needed" };
      return {
        state:
          sub.emailDeliveryStatus === "SUBSCRIBED"
            ? "active_paid"
            : "active_email_paused",
      };
    case "ADMIN_OVERRIDE":
      return {
        state:
          sub.emailDeliveryStatus === "SUBSCRIBED"
            ? "active_paid"
            : "active_email_paused",
      };
    case "PAST_DUE":
      if (!providerConfirmed) return { state: "checkout_needed" };
      return { state: "past_due" };
    case "CANCELED":
      if (!providerConfirmed) return { state: "checkout_needed" };
      if (sub.currentPeriodEnd && now < sub.currentPeriodEnd) {
        return {
          state: "canceled_active",
          periodEndsAt: sub.currentPeriodEnd.toISOString(),
        };
      }
      return { state: "expired" };
    case "EXPIRED":
    default:
      return { state: "expired" };
  }
}

/** Re-enables email delivery (case I). Leaves SUPPRESSED alone. */
export async function resumeLingoEmailDelivery(email: string): Promise<boolean> {
  const sub = await findOneLingoSubscription(email);
  if (!sub || sub.emailDeliveryStatus === "SUPPRESSED") return false;
  await prisma.productSubscription.update({
    where: { id: sub.id },
    data: { emailDeliveryStatus: "SUBSCRIBED" },
  });
  return true;
}

/** Preferences fields written from the OneLingo signup form. */
export interface LingoPreferencesInput {
  targetLanguage: string;
  nativeLanguage: string;
  level: string;
  learningGoal: string;
  practiceStyle: string;
  interests: string[];
  minutesPerDay: number;
  wantsVocabulary: boolean;
  wantsPhrases: boolean;
  wantsGrammar: boolean;
  wantsMiniQuiz: boolean;
  wantsCultureNote: boolean;
}

/** Creates or updates the LingoPreferences for a subscription (1:1 upsert). */
export async function upsertLingoPreferences(
  sub: { id: string; contactId: string },
  prefs: LingoPreferencesInput,
): Promise<LingoPreferences> {
  return prisma.lingoPreferences.upsert({
    where: { productSubscriptionId: sub.id },
    update: { ...prefs },
    create: {
      productSubscriptionId: sub.id,
      contactId: sub.contactId,
      ...prefs,
    },
  });
}

/**
 * Marks a subscription ready for provider checkout after preferences are
 * complete. Polar owns trial creation; this never writes trial fields.
 */
export async function markLingoReadyForCheckout(
  subId: string,
): Promise<LingoSubscriptionWithPrefs> {
  const sub = await prisma.productSubscription.findUniqueOrThrow({
    where: { id: subId },
    include: { lingoPreferences: true },
  });

  if (
    sub.status === "ADMIN_OVERRIDE" ||
    sub.status === "ACTIVE_PAID" ||
    sub.status === "TRIALING" ||
    sub.status === "CANCELED" ||
    sub.status === "PAST_DUE"
  ) {
    return sub;
  }

  return prisma.productSubscription.update({
    where: { id: subId },
    data: { status: "PENDING_CHECKOUT" },
    include: { lingoPreferences: true },
  });
}
