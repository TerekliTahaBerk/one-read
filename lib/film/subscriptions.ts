import type { FilmPreferences, ProductSubscription } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ONE_FILM_PRODUCT_KEY, isAlwaysSubscribed } from "@/lib/options";
import {
  canReceiveProductEmail,
  type EligibilityInput,
  type EligibilityResult,
} from "@/lib/billing/access";
import type { SubscribeLookupResult } from "@/lib/subscriptions";

/**
 * Data-access layer over Contact / ProductSubscription / FilmPreferences for
 * OneFilm. Mirrors lib/lingo/subscriptions.ts and lib/news/subscriptions.ts.
 */

export type FilmSubscriptionWithPrefs = ProductSubscription & {
  filmPreferences: FilmPreferences | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * OneFilm preferences are "complete" when the subscriber has chosen an email
 * language and at least one genre. Other fields refine but are not required.
 */
export function filmPreferencesComplete(
  prefs: Pick<FilmPreferences, "emailLanguage" | "preferredGenres"> | null,
): boolean {
  return Boolean(prefs && prefs.emailLanguage && prefs.preferredGenres.length > 0);
}

export function toFilmEligibilityInput(
  sub: FilmSubscriptionWithPrefs,
): EligibilityInput {
  return {
    status: sub.status,
    emailDeliveryStatus: sub.emailDeliveryStatus,
    paymentProvider: sub.paymentProvider,
    adminOverride: sub.adminOverride,
    trialEndsAt: sub.trialEndsAt,
    currentPeriodEnd: sub.currentPeriodEnd,
    pastDueAt: sub.pastDueAt,
    hasCompletePreferences: filmPreferencesComplete(sub.filmPreferences),
  };
}

export function evaluateFilmEligibility(
  sub: FilmSubscriptionWithPrefs,
  now: Date = new Date(),
): EligibilityResult {
  const prefs = sub.filmPreferences;
  if (prefs && !(prefs.emailLanguage && prefs.preferredGenres.length > 0)) {
    return { allowed: false, reason: "missing_film_preferences" };
  }
  return canReceiveProductEmail(toFilmEligibilityInput(sub), now);
}

export async function findOneFilmSubscription(
  email: string,
): Promise<FilmSubscriptionWithPrefs | null> {
  const contact = await prisma.contact.findUnique({
    where: { email },
    include: {
      subscriptions: {
        where: { productKey: ONE_FILM_PRODUCT_KEY },
        include: { filmPreferences: true },
        take: 1,
      },
    },
  });
  return contact?.subscriptions[0] ?? null;
}

export async function ensureOneFilmSubscription(
  email: string,
): Promise<FilmSubscriptionWithPrefs> {
  const override = isAlwaysSubscribed(email);
  const contact = await prisma.contact.upsert({
    where: { email },
    update: {},
    create: { email },
  });

  const existing = await prisma.productSubscription.findUnique({
    where: {
      contactId_productKey: { contactId: contact.id, productKey: ONE_FILM_PRODUCT_KEY },
    },
    include: { filmPreferences: true },
  });
  if (existing) return existing;

  return prisma.productSubscription.create({
    data: {
      contactId: contact.id,
      productKey: ONE_FILM_PRODUCT_KEY,
      status: override ? "ADMIN_OVERRIDE" : "PENDING_PREFERENCES",
      adminOverride: override,
      adminNote: override ? "always-subscribed (founder)" : null,
    },
    include: { filmPreferences: true },
  });
}

export async function getOneFilmEligibilityByEmail(
  now: Date = new Date(),
): Promise<Map<string, EligibilityResult>> {
  const subs = await prisma.productSubscription.findMany({
    where: { productKey: ONE_FILM_PRODUCT_KEY },
    include: { filmPreferences: true, contact: { select: { email: true } } },
  });
  const map = new Map<string, EligibilityResult>();
  for (const sub of subs) map.set(sub.contact.email, evaluateFilmEligibility(sub, now));
  return map;
}

const dayDiffCeil = (from: Date, to: Date): number =>
  Math.max(0, Math.ceil((to.getTime() - from.getTime()) / DAY_MS));

function providerConfirmsSubscription(sub: FilmSubscriptionWithPrefs): boolean {
  if (sub.adminOverride) return true;
  if (sub.paymentProvider === "polar") return true;
  return sub.paymentProvider === "mock" && process.env.NODE_ENV !== "production";
}

export async function resolveFilmSubscribeState(
  email: string,
  now: Date = new Date(),
): Promise<SubscribeLookupResult> {
  const sub = await findOneFilmSubscription(email);
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
        state: sub.emailDeliveryStatus === "SUBSCRIBED" ? "active_paid" : "active_email_paused",
      };
    case "ADMIN_OVERRIDE":
      return {
        state: sub.emailDeliveryStatus === "SUBSCRIBED" ? "active_paid" : "active_email_paused",
      };
    case "PAST_DUE":
      if (!providerConfirmed) return { state: "checkout_needed" };
      return { state: "past_due" };
    case "CANCELED":
      if (!providerConfirmed) return { state: "checkout_needed" };
      if (sub.currentPeriodEnd && now < sub.currentPeriodEnd) {
        return { state: "canceled_active", periodEndsAt: sub.currentPeriodEnd.toISOString() };
      }
      return { state: "expired" };
    case "EXPIRED":
    default:
      return { state: "expired" };
  }
}

export async function resumeFilmEmailDelivery(email: string): Promise<boolean> {
  const sub = await findOneFilmSubscription(email);
  if (!sub || sub.emailDeliveryStatus === "SUPPRESSED") return false;
  await prisma.productSubscription.update({
    where: { id: sub.id },
    data: { emailDeliveryStatus: "SUBSCRIBED" },
  });
  return true;
}

export interface FilmPreferencesInput {
  emailLanguage: string;
  preferredGenres: string[];
  moods: string[];
  decades: string[];
  languages: string[];
  platforms: string[];
  spoilerPreference: string;
  familiarity: string;
  runtimePreference: string;
}

export async function upsertFilmPreferences(
  sub: { id: string; contactId: string },
  prefs: FilmPreferencesInput,
): Promise<FilmPreferences> {
  return prisma.filmPreferences.upsert({
    where: { productSubscriptionId: sub.id },
    update: { ...prefs },
    create: { productSubscriptionId: sub.id, contactId: sub.contactId, ...prefs },
  });
}

export async function markFilmReadyForCheckout(
  subId: string,
): Promise<FilmSubscriptionWithPrefs> {
  const sub = await prisma.productSubscription.findUniqueOrThrow({
    where: { id: subId },
    include: { filmPreferences: true },
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
    include: { filmPreferences: true },
  });
}
