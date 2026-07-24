import type { ProductSubscription, ArticlePreferences, FilmPreferences } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  ONE_READ_PRODUCT_KEY,
  ONE_ARTICLE_PRODUCT_KEY,
  ONE_FILM_PRODUCT_KEY,
  isAlwaysSubscribed,
} from "@/lib/options";
import { ONE_READ_INCLUDED_PRODUCT_KEYS } from "@/lib/oneread/config";
import { hasValidAccess, type EligibilityResult } from "@/lib/billing/access";
import { preferencesComplete } from "@/lib/subscriptions";
import { filmPreferencesComplete } from "@/lib/film/subscriptions";
import type { SubscribeLookupResult } from "@/lib/subscriptions";

/**
 * OneRead access model. A current subscriber holds two
 * `ProductSubscription` rows per Contact:
 *   - `productKey = "one-read"`   — the billing row (Polar checkout/webhook).
 *   - `productKey = "one-article"` — preferences-holder row; may ALSO be a real
 *     legacy paid subscription for pre-umbrella customers.
 *
 * Access to OneArticle is granted if EITHER its own row has valid
 * access (legacy path) OR the contact's `one-read` row has valid access
 * (umbrella path). This is fully additive — no schema changes, no migration.
 */

type ArticleHolder = ProductSubscription & { preferences: ArticlePreferences | null };
type FilmHolder = ProductSubscription & { filmPreferences: FilmPreferences | null };

/** Ensures a Contact + `one-read` ProductSubscription exist for the email. */
export async function ensureOneReadSubscription(
  email: string,
): Promise<ProductSubscription> {
  const override = isAlwaysSubscribed(email);
  const contact = await prisma.contact.upsert({
    where: { email },
    update: {},
    create: { email },
  });

  const existing = await prisma.productSubscription.findUnique({
    where: { contactId_productKey: { contactId: contact.id, productKey: ONE_READ_PRODUCT_KEY } },
  });
  if (existing) return existing;

  return prisma.productSubscription.create({
    data: {
      contactId: contact.id,
      productKey: ONE_READ_PRODUCT_KEY,
      status: override ? "ADMIN_OVERRIDE" : "PENDING_PREFERENCES",
      adminOverride: override,
      adminNote: override ? "always-subscribed (founder)" : null,
    },
  });
}

/** Ensures the OneArticle preferences-holder row exists for a contact. */
export async function ensureArticlePreferencesHolder(contactId: string): Promise<ArticleHolder> {
  const existing = await prisma.productSubscription.findUnique({
    where: { contactId_productKey: { contactId, productKey: ONE_ARTICLE_PRODUCT_KEY } },
    include: { preferences: true },
  });
  if (existing) return existing;

  return prisma.productSubscription.create({
    data: {
      contactId,
      productKey: ONE_ARTICLE_PRODUCT_KEY,
      status: "PENDING_PREFERENCES",
    },
    include: { preferences: true },
  });
}

/** Ensures the OneFilm preferences-holder row exists for a contact. */
export async function ensureFilmPreferencesHolder(contactId: string): Promise<FilmHolder> {
  const existing = await prisma.productSubscription.findUnique({
    where: { contactId_productKey: { contactId, productKey: ONE_FILM_PRODUCT_KEY } },
    include: { filmPreferences: true },
  });
  if (existing) return existing;

  return prisma.productSubscription.create({
    data: {
      contactId,
      productKey: ONE_FILM_PRODUCT_KEY,
      status: "PENDING_PREFERENCES",
    },
    include: { filmPreferences: true },
  });
}

/** Generic dispatcher over the holder-ensure functions above. */
export async function ensureProductPreferencesHolder(
  contactId: string,
  productKey: string,
): Promise<ProductSubscription> {
  if (productKey === ONE_FILM_PRODUCT_KEY) return ensureFilmPreferencesHolder(contactId);
  return ensureArticlePreferencesHolder(contactId);
}

/** Products included when a contact has a given productKey subscription. */
export function getIncludedProductsForSubscription(productKey: string): readonly string[] {
  return productKey === ONE_READ_PRODUCT_KEY
    ? ONE_READ_INCLUDED_PRODUCT_KEYS
    : [productKey];
}

async function findOneReadRow(contactId: string): Promise<ProductSubscription | null> {
  return prisma.productSubscription.findUnique({
    where: { contactId_productKey: { contactId, productKey: ONE_READ_PRODUCT_KEY } },
  });
}

export async function hasOneReadUmbrellaAccess(contactId: string): Promise<boolean> {
  const sub = await findOneReadRow(contactId);
  return sub ? hasValidAccess(sub).allowed : false;
}

/**
 * Composes legacy per-product access and umbrella OneRead access into a single
 * eligibility result. `missingPreferencesReason` and `legacyReason` let the two
 * per-product wrappers below reuse this without duplicating the access logic.
 */
async function resolveProductEligibility(
  contactId: string,
  holder: (ProductSubscription & Record<string, unknown>) | null,
  hasCompletePreferences: boolean,
  missingPreferencesReason: EligibilityResult["reason"],
  legacyReason: EligibilityResult["reason"],
  now: Date,
): Promise<EligibilityResult> {
  if (!hasCompletePreferences) {
    return { allowed: false, reason: missingPreferencesReason };
  }
  if (holder) {
    if (holder.emailDeliveryStatus === "SUPPRESSED") {
      return { allowed: false, reason: "email_suppressed" };
    }
    if (holder.emailDeliveryStatus !== "SUBSCRIBED") {
      return { allowed: false, reason: "email_unsubscribed" };
    }
    const legacy = hasValidAccess(holder as ProductSubscription, now);
    if (legacy.allowed) return { allowed: true, reason: legacyReason };
  }

  const oneRead = await findOneReadRow(contactId);
  if (!oneRead) return { allowed: false, reason: "checkout_required" };
  const umbrella = hasValidAccess(oneRead, now);
  if (umbrella.allowed) return { allowed: true, reason: "included_in_oneread" };
  return { allowed: false, reason: umbrella.reason };
}

export async function resolveOneArticleEligibilityForContact(
  contactId: string,
  now: Date = new Date(),
): Promise<EligibilityResult> {
  const holder = await prisma.productSubscription.findUnique({
    where: { contactId_productKey: { contactId, productKey: ONE_ARTICLE_PRODUCT_KEY } },
    include: { preferences: true },
  });
  const hasCompletePreferences = preferencesComplete(holder?.preferences ?? null);
  return resolveProductEligibility(
    contactId,
    holder,
    hasCompletePreferences,
    "missing_article_preferences",
    "legacy_one_article_access",
    now,
  );
}

export async function resolveOneFilmEligibilityForContact(
  contactId: string,
  now: Date = new Date(),
): Promise<EligibilityResult> {
  const holder = await prisma.productSubscription.findUnique({
    where: { contactId_productKey: { contactId, productKey: ONE_FILM_PRODUCT_KEY } },
    include: { filmPreferences: true },
  });
  const hasCompletePreferences = filmPreferencesComplete(holder?.filmPreferences ?? null);
  return resolveProductEligibility(
    contactId,
    holder,
    hasCompletePreferences,
    "missing_film_preferences",
    "legacy_one_film_access",
    now,
  );
}

/**
 * Once OneArticle preferences are complete, the `one-read`
 * row can move from PENDING_PREFERENCES to PENDING_CHECKOUT. Mirrors
 * `markReadyForCheckout` in lib/subscriptions.ts — never touches trial fields,
 * Polar owns those.
 */
export async function markOneReadReadyForCheckoutIfEligible(
  contactId: string,
): Promise<ProductSubscription | null> {
  const [oneRead, articleHolder] = await Promise.all([
    findOneReadRow(contactId),
    prisma.productSubscription.findUnique({
      where: { contactId_productKey: { contactId, productKey: ONE_ARTICLE_PRODUCT_KEY } },
      include: { preferences: true },
    }),
  ]);
  if (!oneRead) return null;

  if (!preferencesComplete(articleHolder?.preferences ?? null)) return oneRead;

  if (
    oneRead.status === "ADMIN_OVERRIDE" ||
    oneRead.status === "ACTIVE_PAID" ||
    oneRead.status === "TRIALING" ||
    oneRead.status === "CANCELED" ||
    oneRead.status === "PAST_DUE"
  ) {
    return oneRead;
  }

  return prisma.productSubscription.update({
    where: { id: oneRead.id },
    data: { status: "PENDING_CHECKOUT" },
  });
}

/** Resolves the OneRead subscribe-flow state for an email (mirrors resolveSubscribeState). */
export async function resolveOneReadState(
  email: string,
  now: Date = new Date(),
): Promise<SubscribeLookupResult> {
  const contact = await prisma.contact.findUnique({
    where: { email },
    include: {
      subscriptions: { where: { productKey: ONE_READ_PRODUCT_KEY }, take: 1 },
    },
  });
  const sub = contact?.subscriptions[0];
  if (!sub) return { state: "new" };

  if (sub.emailDeliveryStatus === "SUPPRESSED") return { state: "suppressed" };
  const providerConfirmed =
    sub.adminOverride ||
    sub.paymentProvider === "polar" ||
    (sub.paymentProvider === "mock" && process.env.NODE_ENV !== "production");

  const dayDiffCeil = (from: Date, to: Date): number =>
    Math.max(0, Math.ceil((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000)));

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
    case "ADMIN_OVERRIDE":
      if (sub.status === "ACTIVE_PAID" && !providerConfirmed) return { state: "checkout_needed" };
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
