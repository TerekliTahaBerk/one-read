import type { NewsPreferences, ProductSubscription } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ONE_NEWS_PRODUCT_KEY, isAlwaysSubscribed } from "@/lib/options";
import {
  canReceiveProductEmail,
  type EligibilityInput,
  type EligibilityResult,
} from "@/lib/billing/access";
import type { SubscribeLookupResult } from "@/lib/subscriptions";

/**
 * Data-access layer over Contact / ProductSubscription / NewsPreferences for
 * OneNews. Mirrors lib/lingo/subscriptions.ts so the pipeline, signup routes,
 * the subscribe lookup, and admin all read the OneNews model the same way.
 * OneNews never shares a ProductSubscription row with another product (each row
 * is scoped to one productKey), so the layers are fully independent.
 */

export type NewsSubscriptionWithPrefs = ProductSubscription & {
  newsPreferences: NewsPreferences | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * OneNews preferences are "complete" — enough to render a daily briefing — when
 * the subscriber has chosen a briefing language and a region focus. Topics /
 * tone / depth refine but are not strictly required (sensible defaults exist).
 */
export function newsPreferencesComplete(
  prefs: Pick<NewsPreferences, "briefingLanguage" | "regionFocus"> | null,
): boolean {
  return Boolean(prefs && prefs.briefingLanguage && prefs.regionFocus);
}

/** Builds the structural input that `canReceiveProductEmail` expects. */
export function toNewsEligibilityInput(
  sub: NewsSubscriptionWithPrefs,
): EligibilityInput {
  return {
    status: sub.status,
    emailDeliveryStatus: sub.emailDeliveryStatus,
    paymentProvider: sub.paymentProvider,
    adminOverride: sub.adminOverride,
    trialEndsAt: sub.trialEndsAt,
    currentPeriodEnd: sub.currentPeriodEnd,
    pastDueAt: sub.pastDueAt,
    hasCompletePreferences: newsPreferencesComplete(sub.newsPreferences),
  };
}

/**
 * OneNews eligibility. Wraps the shared `canReceiveProductEmail` but reports the
 * more specific `missing_news_preferences` reason when a subscriber has started
 * preferences yet is missing a core field.
 */
export function evaluateNewsEligibility(
  sub: NewsSubscriptionWithPrefs,
  now: Date = new Date(),
): EligibilityResult {
  const prefs = sub.newsPreferences;
  if (prefs && !(prefs.briefingLanguage && prefs.regionFocus)) {
    return { allowed: false, reason: "missing_news_preferences" };
  }
  return canReceiveProductEmail(toNewsEligibilityInput(sub), now);
}

/** Finds the OneNews subscription for an email, or null. Email pre-parsed. */
export async function findOneNewsSubscription(
  email: string,
): Promise<NewsSubscriptionWithPrefs | null> {
  const contact = await prisma.contact.findUnique({
    where: { email },
    include: {
      subscriptions: {
        where: { productKey: ONE_NEWS_PRODUCT_KEY },
        include: { newsPreferences: true },
        take: 1,
      },
    },
  });
  return contact?.subscriptions[0] ?? null;
}

/**
 * Ensures a Contact + OneNews ProductSubscription exist for the email and
 * returns the subscription. Never duplicates a Contact. Founder /
 * always-subscribed emails are created as ADMIN_OVERRIDE. Creates no trial and
 * grants no access — Polar is the source of truth.
 */
export async function ensureOneNewsSubscription(
  email: string,
): Promise<NewsSubscriptionWithPrefs> {
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
        productKey: ONE_NEWS_PRODUCT_KEY,
      },
    },
    include: { newsPreferences: true },
  });
  if (existing) return existing;

  return prisma.productSubscription.create({
    data: {
      contactId: contact.id,
      productKey: ONE_NEWS_PRODUCT_KEY,
      status: override ? "ADMIN_OVERRIDE" : "PENDING_PREFERENCES",
      adminOverride: override,
      adminNote: override ? "always-subscribed (founder)" : null,
    },
    include: { newsPreferences: true },
  });
}

/** Builds an email → eligibility map for every OneNews subscription. */
export async function getOneNewsEligibilityByEmail(
  now: Date = new Date(),
): Promise<Map<string, EligibilityResult>> {
  const subs = await prisma.productSubscription.findMany({
    where: { productKey: ONE_NEWS_PRODUCT_KEY },
    include: { newsPreferences: true, contact: { select: { email: true } } },
  });
  const map = new Map<string, EligibilityResult>();
  for (const sub of subs) {
    map.set(sub.contact.email, evaluateNewsEligibility(sub, now));
  }
  return map;
}

const dayDiffCeil = (from: Date, to: Date): number =>
  Math.max(0, Math.ceil((to.getTime() - from.getTime()) / DAY_MS));

function providerConfirmsSubscription(sub: NewsSubscriptionWithPrefs): boolean {
  if (sub.adminOverride) return true;
  if (sub.paymentProvider === "polar") return true;
  return sub.paymentProvider === "mock" && process.env.NODE_ENV !== "production";
}

/**
 * Resolves the subscribe-flow state for an email. Read-only; never mutates and
 * never exposes provider/billing identifiers. Reuses the shared SubscribeState.
 */
export async function resolveNewsSubscribeState(
  email: string,
  now: Date = new Date(),
): Promise<SubscribeLookupResult> {
  const sub = await findOneNewsSubscription(email);
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

/** Re-enables email delivery. Leaves SUPPRESSED alone. */
export async function resumeNewsEmailDelivery(email: string): Promise<boolean> {
  const sub = await findOneNewsSubscription(email);
  if (!sub || sub.emailDeliveryStatus === "SUPPRESSED") return false;
  await prisma.productSubscription.update({
    where: { id: sub.id },
    data: { emailDeliveryStatus: "SUBSCRIBED" },
  });
  return true;
}

/** Preferences fields written from the OneNews signup form. */
export interface NewsPreferencesInput {
  briefingLanguage: string;
  regionFocus: string;
  topics: string[];
  excludedTopics: string[];
  tone: string;
  depth: string;
  sourcePreference: string;
  wantsWorld: boolean;
  wantsBusiness: boolean;
  wantsTechnology: boolean;
  wantsCulture: boolean;
  wantsScience: boolean;
  wantsSports: boolean;
}

/** Creates or updates the NewsPreferences for a subscription (1:1 upsert). */
export async function upsertNewsPreferences(
  sub: { id: string; contactId: string },
  prefs: NewsPreferencesInput,
): Promise<NewsPreferences> {
  return prisma.newsPreferences.upsert({
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
export async function markNewsReadyForCheckout(
  subId: string,
): Promise<NewsSubscriptionWithPrefs> {
  const sub = await prisma.productSubscription.findUniqueOrThrow({
    where: { id: subId },
    include: { newsPreferences: true },
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
    include: { newsPreferences: true },
  });
}
