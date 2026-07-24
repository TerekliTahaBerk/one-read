import type { ArticlePreferences, ProductSubscription } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ONE_ARTICLE_PRODUCT_KEY, isAlwaysSubscribed } from "@/lib/options";
import {
  canReceiveOneArticleEmail,
  type EligibilityInput,
  type EligibilityResult,
} from "@/lib/billing/access";

/**
 * Data-access layer over the Contact / ProductSubscription / ArticlePreferences
 * trio. Centralizes the queries so the pipeline, signup routes, the subscribe
 * lookup, and admin all read the new model the same way.
 */

export type SubscriptionWithPrefs = ProductSubscription & {
  preferences: ArticlePreferences | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * One-Article preferences are "complete" — i.e. enough to render an email —
 * when the subscriber has chosen a reading language. Legacy interest fields
 * remain stored but no longer participate in eligibility.
 */
export function preferencesComplete(
  prefs: Pick<ArticlePreferences, "interests" | "summaryLanguage"> | null,
): boolean {
  return Boolean(prefs?.summaryLanguage);
}

/** Builds the structural input that `canReceiveOneArticleEmail` expects. */
export function toEligibilityInput(sub: SubscriptionWithPrefs): EligibilityInput {
  return {
    status: sub.status,
    emailDeliveryStatus: sub.emailDeliveryStatus,
    paymentProvider: sub.paymentProvider,
    adminOverride: sub.adminOverride,
    trialEndsAt: sub.trialEndsAt,
    currentPeriodEnd: sub.currentPeriodEnd,
    pastDueAt: sub.pastDueAt,
    hasCompletePreferences: preferencesComplete(sub.preferences),
  };
}

/** Convenience wrapper: eligibility straight from a loaded subscription. */
export function evaluateEligibility(
  sub: SubscriptionWithPrefs,
  now: Date = new Date(),
): EligibilityResult {
  return canReceiveOneArticleEmail(toEligibilityInput(sub), now);
}

/**
 * Finds the One Article subscription for an email, or null. Normalizes nothing
 * — callers should pass an already-parsed (lowercased) email.
 */
export async function findOneArticleSubscription(
  email: string,
): Promise<SubscriptionWithPrefs | null> {
  const contact = await prisma.contact.findUnique({
    where: { email },
    include: {
      subscriptions: {
        where: { productKey: ONE_ARTICLE_PRODUCT_KEY },
        include: { preferences: true },
        take: 1,
      },
    },
  });
  return contact?.subscriptions[0] ?? null;
}

/**
 * Ensures a Contact + One Article ProductSubscription exist for the email and
 * returns the subscription. Never creates a duplicate Contact for the same
 * email. Founder / always-subscribed emails are created as ADMIN_OVERRIDE.
 */
export async function ensureOneArticleSubscription(
  email: string,
): Promise<SubscriptionWithPrefs> {
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
        productKey: ONE_ARTICLE_PRODUCT_KEY,
      },
    },
    include: { preferences: true },
  });
  if (existing) return existing;

  return prisma.productSubscription.create({
    data: {
      contactId: contact.id,
      productKey: ONE_ARTICLE_PRODUCT_KEY,
      status: override ? "ADMIN_OVERRIDE" : "PENDING_PREFERENCES",
      adminOverride: override,
      adminNote: override ? "always-subscribed (founder)" : null,
    },
    include: { preferences: true },
  });
}

/**
 * Builds an email → eligibility map for every One Article subscription. The
 * daily pipeline uses this as its single gate: a subscriber is sent an email
 * only if they're eligible right now — either via a legacy standalone
 * OneArticle subscription or via umbrella OneRead access (see
 * lib/oneread/access.ts). Centralizing here keeps eligibility logic out of
 * the pipeline itself.
 */
export async function getOneArticleEligibilityByEmail(
  now: Date = new Date(),
): Promise<Map<string, EligibilityResult>> {
  // Lazy import avoids a hard circular dependency at module-eval time —
  // lib/oneread/access.ts imports `preferencesComplete` from this module.
  const { resolveOneArticleEligibilityForContact } = await import("@/lib/oneread/access");
  const subs = await prisma.productSubscription.findMany({
    where: { productKey: ONE_ARTICLE_PRODUCT_KEY },
    include: { contact: { select: { id: true, email: true } } },
  });
  const map = new Map<string, EligibilityResult>();
  for (const sub of subs) {
    map.set(sub.contact.email, await resolveOneArticleEligibilityForContact(sub.contact.id, now));
  }
  return map;
}

/**
 * Resolved states for the /article/subscribe email-lookup flow. Each maps to a
 * card with its own copy + CTAs (cases A–J in the plan). Intentionally distinct
 * from the raw access status: it folds in trial-expiry timing and the email
 * delivery axis so the UI never has to re-derive them.
 */
export type SubscribeState =
  | "new" // A — no record
  | "incomplete" // B — PENDING_PREFERENCES
  | "checkout_needed" // C — preferences complete, awaiting Polar checkout
  | "trialing" // D — Polar-confirmed trial active, or preserved legacy trial
  | "trial_expired" // E — preserved legacy trial ended, unpaid
  | "active_paid" // E — paid & emails on (incl. comped)
  | "canceled_active" // F — canceled, still inside paid period
  | "expired" // G — canceled/expired, period over
  | "past_due" // H — payment needs attention
  | "active_email_paused" // I — paid but unsubscribed from email
  | "suppressed"; // J — bounced/complained

export interface SubscribeLookupResult {
  state: SubscribeState;
  /** Whole days left in the trial (only for "trialing"). */
  daysLeft?: number;
  /** ISO date the paid period ends (only for "canceled_active"). */
  periodEndsAt?: string;
}

const dayDiffCeil = (from: Date, to: Date): number =>
  Math.max(0, Math.ceil((to.getTime() - from.getTime()) / DAY_MS));

function providerConfirmsSubscription(sub: SubscriptionWithPrefs): boolean {
  if (sub.adminOverride) return true;
  if (sub.paymentProvider === "polar") return true;
  return sub.paymentProvider === "mock" && process.env.NODE_ENV !== "production";
}

/**
 * Resolves the subscribe-flow state for an email. Read-only; never mutates and
 * never exposes provider/billing identifiers. Email must be pre-parsed.
 */
export async function resolveSubscribeState(
  email: string,
  now: Date = new Date(),
): Promise<SubscribeLookupResult> {
  const sub = await findOneArticleSubscription(email);
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

/**
 * Re-enables email delivery for a subscription (case I — paid but emails
 * paused). Only flips SUBSCRIBED; SUPPRESSED (hard bounce) is left alone and
 * must be cleared deliberately. Returns true if a row was updated.
 */
export async function resumeEmailDelivery(email: string): Promise<boolean> {
  const sub = await findOneArticleSubscription(email);
  if (!sub || sub.emailDeliveryStatus === "SUPPRESSED") return false;
  await prisma.productSubscription.update({
    where: { id: sub.id },
    data: { emailDeliveryStatus: "SUBSCRIBED" },
  });
  return true;
}

/** Preferences fields written from the signup form. */
export interface ArticlePreferencesInput {
  interests: string[];
  primaryInterest: string | null;
  secondaryInterests: string[];
  sourceLanguage: string;
  summaryLanguage: string;
}

/**
 * Creates or updates the ArticlePreferences for a subscription. The 1:1
 * relation means an upsert keyed on productSubscriptionId.
 */
export async function upsertArticlePreferences(
  subId: string,
  prefs: ArticlePreferencesInput,
): Promise<ArticlePreferences> {
  return prisma.articlePreferences.upsert({
    where: { productSubscriptionId: subId },
    update: { ...prefs },
    create: { productSubscriptionId: subId, ...prefs },
  });
}

/**
 * Marks a subscription ready for provider checkout after preferences are
 * complete. Polar owns trial creation; this deliberately does not write
 * trialStartedAt/trialEndsAt/trialUsedAt.
 */
export async function markReadyForCheckout(
  subId: string,
): Promise<SubscriptionWithPrefs> {
  const sub = await prisma.productSubscription.findUniqueOrThrow({
    where: { id: subId },
    include: { preferences: true },
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
    data: {
      status: "PENDING_CHECKOUT",
    },
    include: { preferences: true },
  });
}
