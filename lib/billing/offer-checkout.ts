/**
 * Server-side entry points for the six current offers.
 *
 * Everything a browser can influence arrives here as an `(offer, interval)`
 * pair that has already been validated against the product registry. Provider
 * product ids are resolved server-side from configuration and are never
 * accepted from, or echoed back to, the client — so a caller cannot name the
 * Polar product they would like to be billed for.
 *
 * The legacy `$1` umbrella flow in lib/oneread/checkout.ts is untouched and
 * still serves the live signup page. It is a separate code path on purpose:
 * pointing it at this module would reprice new signups the moment the new
 * product ids were configured.
 */

import { prisma } from "@/lib/prisma";
import { createPolarOfferCheckout, polarPlanChange } from "@/lib/billing/polar";
import {
  MissingPolarOfferConfigError,
  resolveCheckoutProductId,
} from "@/lib/products/polar-config";
import {
  OFFERS,
  type BillingIntervalKey,
  type OfferKey,
} from "@/lib/products/registry";
import { classifySubscription } from "@/lib/products/classification";
import {
  previewTransition,
  startTransition,
  type TransitionPreview,
  type TransitionResult,
  type TransitionSubscription,
} from "@/lib/billing/transitions";
import { hasValidAccess } from "@/lib/billing/access";

export type OfferCheckoutResult =
  | { kind: "redirect"; url: string }
  /** Already paying for this exact offer — manage billing rather than rebuy. */
  | { kind: "already_active"; billingManageable: boolean }
  /**
   * The subscriber holds a different paid plan. Buying a second one would
   * double-bill them, so they are routed to the transition flow instead.
   */
  | { kind: "transition_required"; currentOfferKey: string }
  | { kind: "not_configured"; envVar: string };

/** The subscription row an offer is recorded against. */
function subscriptionProductKeyFor(offer: OfferKey): string {
  return offer;
}

async function ensureContact(email: string): Promise<{ id: string }> {
  return prisma.contact.upsert({
    where: { email },
    update: {},
    create: { email },
    select: { id: true },
  });
}

async function ensureOfferSubscriptionRow(contactId: string, offer: OfferKey) {
  const productKey = subscriptionProductKeyFor(offer);
  const existing = await prisma.productSubscription.findUnique({
    where: { contactId_productKey: { contactId, productKey } },
  });
  if (existing) return existing;

  return prisma.productSubscription.create({
    data: { contactId, productKey, status: "PENDING_CHECKOUT" },
  });
}

/**
 * Starts a checkout for one of the six current offers.
 *
 * Fails closed: an unconfigured (offer, interval) returns `not_configured`
 * naming the environment variable for the operator. It never substitutes
 * another interval, another offer, or a legacy product.
 */
export async function startOfferCheckout(args: {
  email: string;
  offer: OfferKey;
  interval: BillingIntervalKey;
}): Promise<OfferCheckoutResult> {
  const { email, offer, interval } = args;

  // Check configuration before touching the database, so a misconfigured offer
  // never leaves a half-created subscription row behind.
  try {
    resolveCheckoutProductId(offer, interval);
  } catch (error) {
    if (error instanceof MissingPolarOfferConfigError) {
      return { kind: "not_configured", envVar: error.envVar };
    }
    throw error;
  }

  const contact = await ensureContact(email);

  // Any other row that is currently granting paid access. Selling a second
  // overlapping plan is exactly the double-billing this guard exists to stop.
  const existingRows = await prisma.productSubscription.findMany({
    where: { contactId: contact.id },
  });

  const targetRow = existingRows.find(
    (row) => row.productKey === subscriptionProductKeyFor(offer),
  );
  if (targetRow && hasValidAccess(targetRow).allowed) {
    return {
      kind: "already_active",
      billingManageable: targetRow.paymentProvider === "polar",
    };
  }

  // A second subscription is only a problem when it would pay twice for the
  // same product. Holding OneArticle and buying OneNews is a legitimate state
  // (two disjoint grants); holding OneArticle and buying the bundle is not,
  // because the bundle already includes OneArticle — that is a plan change.
  const targetGrants = new Set(OFFERS[offer].grants);
  const overlapping = existingRows.find((row) => {
    if (row.productKey === subscriptionProductKeyFor(offer)) return false;
    if (row.paymentProvider !== "polar" || row.providerSubscriptionId === null) return false;
    if (!hasValidAccess(row).allowed) return false;
    return classifySubscription(row).grants.some((product) => targetGrants.has(product));
  });
  if (overlapping) {
    return {
      kind: "transition_required",
      currentOfferKey: overlapping.offerKey ?? overlapping.productKey,
    };
  }

  const sub = targetRow ?? (await ensureOfferSubscriptionRow(contact.id, offer));
  const { url } = await createPolarOfferCheckout({ sub, email, offer, interval });
  return { kind: "redirect", url };
}

/** The row a transition should act on: the contact's live paid subscription. */
async function findTransitionSubscription(
  email: string,
): Promise<TransitionSubscription | null> {
  const contact = await prisma.contact.findUnique({
    where: { email },
    select: { id: true },
  });
  if (!contact) return null;

  const rows = await prisma.productSubscription.findMany({
    where: { contactId: contact.id },
    orderBy: { updatedAt: "desc" },
  });

  const live =
    rows.find(
      (row) =>
        row.paymentProvider === "polar" &&
        row.providerSubscriptionId !== null &&
        hasValidAccess(row).allowed,
    ) ?? null;
  return live;
}

/** Renders a confirmation screen. Performs no provider mutation. */
export async function previewOfferChange(args: {
  email: string;
  offer: OfferKey;
  interval: BillingIntervalKey;
  acknowledgeGrandfatherLoss?: boolean;
}): Promise<TransitionPreview> {
  const sub = await findTransitionSubscription(args.email);
  return previewTransition(
    sub,
    { offer: args.offer, interval: args.interval },
    { acknowledgeGrandfatherLoss: args.acknowledgeGrandfatherLoss },
  );
}

/** Executes a confirmed plan change against Polar. */
export async function changeOffer(args: {
  email: string;
  offer: OfferKey;
  interval: BillingIntervalKey;
  acknowledgeGrandfatherLoss?: boolean;
}): Promise<TransitionResult> {
  const sub = await findTransitionSubscription(args.email);
  return startTransition({
    sub,
    target: { offer: args.offer, interval: args.interval },
    acknowledgeGrandfatherLoss: args.acknowledgeGrandfatherLoss,
    changePlan: polarPlanChange,
  });
}

/** Human label for an offer, for confirmation copy. */
export function offerDisplayName(offer: OfferKey): string {
  return OFFERS[offer].displayName;
}
