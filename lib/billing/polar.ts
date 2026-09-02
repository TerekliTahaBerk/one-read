import { Polar } from "@polar-sh/sdk";
import type { BillingInterval } from "@/lib/options";
import {
  ONE_ARTICLE_PRODUCT_KEY,
  ONE_READ_PRODUCT_KEY,
} from "@/lib/options";
import { oneReadPolarProductId } from "@/lib/oneread/config";
import {
  billingIntervalFromProviderInterval,
  isBillingIntervalKey,
  isOfferKey,
  type BillingIntervalKey,
  type OfferKey,
} from "@/lib/products/registry";
import {
  resolveCheckoutProductId,
  resolveOfferFromProviderProductId,
} from "@/lib/products/polar-config";
import { improveClassification } from "@/lib/products/classification";
import {
  settleTransitionsForSubscription,
  type ProviderPlanChange,
} from "@/lib/billing/transitions";
import { prisma } from "@/lib/prisma";
import {
  findOneArticleSubscription,
  preferencesComplete,
  type SubscriptionWithPrefs,
} from "@/lib/subscriptions";
import type {
  BillingProvider,
  CheckoutResult,
  CreateCheckoutArgs,
  ProviderSubscriptionStatus,
  RedirectResult,
} from "./types";

const PROVIDER = "polar" as const;
const DEFAULT_ONE_ARTICLE_PRODUCT_ID =
  "44ef8bae-87eb-40eb-9a07-8b4a97e1434e";

type PolarServer = "sandbox" | "production";

function has(value: string | undefined): value is string {
  return Boolean(value && value.trim().length > 0);
}

export function getPolarServer(): PolarServer {
  return process.env.POLAR_SERVER === "production" ? "production" : "sandbox";
}

/**
 * Resolves the Polar product id for the current umbrella checkout or the
 * retained standalone OneArticle billing path.
 */
export function getPolarProductId(
  productKey: string = ONE_ARTICLE_PRODUCT_KEY,
): string {
  if (productKey === ONE_READ_PRODUCT_KEY) {
    const id = oneReadPolarProductId();
    if (!id) {
      throw new Error(
        "OneRead billing is not configured. Missing: POLAR_ONEREAD_PRODUCT_ID.",
      );
    }
    return id;
  }
  return (
    process.env.POLAR_ONE_ARTICLE_PRODUCT_ID?.trim() ||
    DEFAULT_ONE_ARTICLE_PRODUCT_ID
  );
}

function getMissingPolarConfig(): string[] {
  const missing: string[] = [];
  if (!has(process.env.POLAR_ACCESS_TOKEN)) missing.push("POLAR_ACCESS_TOKEN");
  if (!has(process.env.POLAR_SUCCESS_URL) && !has(process.env.PUBLIC_BASE_URL)) {
    missing.push("POLAR_SUCCESS_URL or PUBLIC_BASE_URL");
  }
  return missing;
}

export function isPolarConfigured(): boolean {
  return getMissingPolarConfig().length === 0;
}

function assertPolarConfigured(context: string): void {
  const missing = getMissingPolarConfig();
  if (missing.length > 0) {
    throw new Error(`${context} is not configured. Missing: ${missing.join(", ")}.`);
  }
}

export function getPolarClient(): Polar {
  const accessToken = process.env.POLAR_ACCESS_TOKEN;
  if (!has(accessToken)) {
    throw new Error("Polar access token is not configured.");
  }
  return new Polar({ accessToken, server: getPolarServer() });
}

function checkoutReturnUrl(
  productKey: string = ONE_ARTICLE_PRODUCT_KEY,
): string | undefined {
  if (productKey === ONE_READ_PRODUCT_KEY) {
    if (has(process.env.POLAR_ONEREAD_RETURN_URL)) {
      return process.env.POLAR_ONEREAD_RETURN_URL;
    }
    const base = process.env.PUBLIC_BASE_URL?.replace(/\/$/, "");
    return base ? `${base}/subscribe` : undefined;
  }
  if (
    productKey === ONE_ARTICLE_PRODUCT_KEY &&
    has(process.env.POLAR_ONE_ARTICLE_RETURN_URL)
  ) {
    return process.env.POLAR_ONE_ARTICLE_RETURN_URL;
  }
  const base = process.env.PUBLIC_BASE_URL?.replace(/\/$/, "");
  return base ? `${base}/article/subscribe` : undefined;
}

function checkoutSuccessUrl(
  productKey: string = ONE_ARTICLE_PRODUCT_KEY,
): string {
  if (productKey === ONE_READ_PRODUCT_KEY) {
    if (has(process.env.POLAR_ONEREAD_SUCCESS_URL)) {
      return process.env.POLAR_ONEREAD_SUCCESS_URL as string;
    }
    const base = process.env.PUBLIC_BASE_URL?.replace(/\/$/, "") || "http://localhost:3000";
    return `${base}/subscribe/success?checkout_id={CHECKOUT_ID}`;
  }
  // OneArticle honors the explicit POLAR_SUCCESS_URL env for back-compat.
  if (productKey === ONE_ARTICLE_PRODUCT_KEY && has(process.env.POLAR_SUCCESS_URL)) {
    return process.env.POLAR_SUCCESS_URL as string;
  }
  if (
    productKey === ONE_ARTICLE_PRODUCT_KEY &&
    has(process.env.POLAR_ONE_ARTICLE_SUCCESS_URL)
  ) {
    return process.env.POLAR_ONE_ARTICLE_SUCCESS_URL;
  }
  const base = process.env.PUBLIC_BASE_URL?.replace(/\/$/, "") || "http://localhost:3000";
  return `${base}/article/subscribe/success?checkout_id={CHECKOUT_ID}`;
}

/**
 * Maps Polar's recurring interval onto the stored `plan` value. Delegates to
 * the product registry so monthly and annual stay in one vocabulary; returning
 * null (rather than defaulting) keeps the caller's existing plan when Polar
 * sends an interval we do not model.
 */
function planFromInterval(interval: string | null): BillingInterval | null {
  return billingIntervalFromProviderInterval(interval);
}

export function mapPolarSubscriptionStatus(status: string): string {
  switch (status) {
    case "trialing":
      return "TRIALING";
    case "active":
      return "ACTIVE_PAID";
    case "past_due":
    case "unpaid":
      return "PAST_DUE";
    case "canceled":
      return "CANCELED";
    case "incomplete_expired":
      return "EXPIRED";
    case "incomplete":
    default:
      return "PENDING_CHECKOUT";
  }
}

export async function createPolarCheckoutForSubscription(
  sub: { id: string; contactId: string },
  email: string,
  productKey: string = ONE_ARTICLE_PRODUCT_KEY,
): Promise<string> {
  assertPolarConfigured("Polar checkout");

  const checkout = await getPolarClient().checkouts.create({
    products: [getPolarProductId(productKey)],
    customerEmail: email,
    externalCustomerId: sub.contactId,
    allowTrial: true,
    successUrl: checkoutSuccessUrl(productKey),
    returnUrl: checkoutReturnUrl(productKey),
    metadata: {
      contactId: sub.contactId,
      productSubscriptionId: sub.id,
      productKey,
      email,
    },
    customerMetadata: {
      contactId: sub.contactId,
      productKey,
      email,
    },
  });

  await prisma.productSubscription.update({
    where: { id: sub.id },
    data: {
      paymentProvider: PROVIDER,
      providerCheckoutSessionId: checkout.id,
    },
  });

  return checkout.url;
}

/**
 * Creates a checkout for one of the six current (offer, interval) combinations.
 *
 * Distinct from `createPolarCheckoutForSubscription`, which still serves the
 * live legacy $1 umbrella flow. Differences that matter commercially:
 *
 *   • The Polar product id comes from `resolveCheckoutProductId`, which is
 *     fail-closed. An unconfigured offer throws naming its own environment
 *     variable and never falls back to another offer, another interval, or a
 *     legacy product — so a new customer cannot land on legacy pricing.
 *   • No `allowTrial`. The $2/$3/$4 offers are sold without a free trial;
 *     historical trial data on existing rows is untouched.
 *   • Metadata carries the offer identity the webhook needs to reconcile the
 *     purchase without guessing (see applyPolarWebhookPayload).
 *
 * The caller supplies `offer`/`interval` as validated registry values. A raw
 * provider product id from a browser can never reach this function.
 */
export const CHECKOUT_METADATA_VERSION = "c2";

export async function createPolarOfferCheckout(args: {
  sub: { id: string; contactId: string };
  email: string;
  offer: OfferKey;
  interval: BillingIntervalKey;
}): Promise<{ url: string; providerProductId: string }> {
  assertPolarConfigured("Polar checkout");
  const { sub, email, offer, interval } = args;

  // Throws MissingPolarOfferConfigError when unconfigured. Deliberately before
  // any database write, so a misconfigured offer leaves no partial state.
  const providerProductId = resolveCheckoutProductId(offer, interval);

  const checkout = await getPolarClient().checkouts.create({
    products: [providerProductId],
    customerEmail: email,
    externalCustomerId: sub.contactId,
    successUrl: checkoutSuccessUrl(offerReturnProductKey(offer)),
    returnUrl: checkoutReturnUrl(offerReturnProductKey(offer)),
    metadata: {
      // Internal ids only — no email. The contact id is enough to reconcile,
      // and keeps PII out of the provider's metadata store.
      contactId: sub.contactId,
      productSubscriptionId: sub.id,
      productKey: offer,
      offerKey: offer,
      billingInterval: interval,
      metadataVersion: CHECKOUT_METADATA_VERSION,
    },
    customerMetadata: {
      contactId: sub.contactId,
      productKey: offer,
    },
  });

  await prisma.productSubscription.update({
    where: { id: sub.id },
    data: {
      paymentProvider: PROVIDER,
      providerCheckoutSessionId: checkout.id,
      // Record the intended purchase now so a webhook that arrives without
      // usable metadata still has a local identity to reconcile against. It is
      // overwritten by provider truth the moment the subscription is confirmed.
      providerProductId,
      offerKey: offer,
      plan: interval,
    },
  });

  return { url: checkout.url, providerProductId };
}

/** Which return/success URL family an offer should use. */
function offerReturnProductKey(offer: OfferKey): string {
  return offer === "one-article" ? ONE_ARTICLE_PRODUCT_KEY : ONE_READ_PRODUCT_KEY;
}

export async function createPolarCustomerPortalUrl(
  sub: { providerCustomerId: string | null; contactId: string },
  productKey: string = ONE_ARTICLE_PRODUCT_KEY,
): Promise<string> {
  assertPolarConfigured("Polar customer portal");
  const returnUrl = checkoutReturnUrl(productKey);
  const session = await getPolarClient().customerSessions.create(
    sub.providerCustomerId
      ? { customerId: sub.providerCustomerId, returnUrl }
      : { externalCustomerId: sub.contactId, returnUrl },
  );
  return session.customerPortalUrl;
}

export class PolarBillingProvider implements BillingProvider {
  readonly name = PROVIDER;

  async createCheckoutSession({
    email,
  }: CreateCheckoutArgs): Promise<CheckoutResult> {
    const sub = await findOneArticleSubscription(email);
    if (!sub) return { kind: "needs_setup_first" };
    if (!preferencesComplete(sub.preferences)) return { kind: "needs_setup" };

    if (
      sub.status === "ACTIVE_PAID" ||
      sub.status === "ADMIN_OVERRIDE" ||
      (sub.status === "TRIALING" &&
        sub.paymentProvider === PROVIDER &&
        sub.trialEndsAt &&
        new Date() < sub.trialEndsAt)
    ) {
      return {
        kind: "already_active",
        manageUrl: "/api/subscribe/portal",
      };
    }

    const url = await createPolarCheckoutForSubscription(sub, email);
    return { kind: "redirect", url };
  }

  async createBillingPortalSession(email: string): Promise<RedirectResult> {
    const sub = await findOneArticleSubscription(email);
    if (!sub) throw new Error("No subscription found.");
    if (!sub.providerCustomerId && sub.paymentProvider !== PROVIDER) {
      throw new Error("Polar customer is not available yet.");
    }
    return { url: await createPolarCustomerPortalUrl(sub) };
  }

  async getSubscriptionStatus(email: string): Promise<ProviderSubscriptionStatus | null> {
    const sub = await findOneArticleSubscription(email);
    if (!sub) return null;
    return {
      status: sub.status,
      plan: sub.plan,
      currentPeriodEnd: sub.currentPeriodEnd,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      provider: PROVIDER,
    };
  }

  async cancelSubscription(email: string): Promise<void> {
    const sub = await findOneArticleSubscription(email);
    if (!sub) throw new Error("No subscription found.");
    if (sub.paymentProvider !== PROVIDER || !sub.providerSubscriptionId) {
      throw new Error("No active Polar subscription is available to cancel.");
    }

    const canceled = await getPolarClient().subscriptions.update({
      id: sub.providerSubscriptionId,
      subscriptionUpdate: { cancelAtPeriodEnd: true },
    });

    await prisma.productSubscription.update({
      where: { id: sub.id },
      data: {
        status: mapPolarSubscriptionStatus(String(canceled.status)),
        cancelAtPeriodEnd: canceled.cancelAtPeriodEnd,
        canceledAt: canceled.canceledAt ?? new Date(),
        currentPeriodStart: canceled.currentPeriodStart ?? sub.currentPeriodStart,
        currentPeriodEnd: canceled.currentPeriodEnd ?? sub.currentPeriodEnd,
      },
    });
  }

  async resumeSubscription(): Promise<void> {
    throw new Error("Use the Polar customer portal to resume subscriptions.");
  }
}

/* ========================= inbound webhook handling ========================= */

type PolarData = Record<string, any>;

/**
 * Why an event did or did not change local billing state. Persisted on
 * BillingEvent for operator diagnosis; never an input to access decisions.
 */
export type PolarWebhookOutcome =
  | "applied"
  /** Not a billing lifecycle event. */
  | "ignored_event_type"
  /** Older than the state we already hold — see billingStateUpdatedAt. */
  | "ignored_stale"
  /** Carries a Polar product we do not recognise. Deliberately not applied. */
  | "unrecognized_product"
  /** Recognised, but no local subscription could be identified. */
  | "no_subscription";

export interface PolarWebhookResult {
  outcome: PolarWebhookOutcome;
  subscriptionId: string | null;
  /** The Polar product id seen on the event, when present. */
  providerProductId: string | null;
}

function metadataValue(data: PolarData, key: string): string | null {
  const value = data.metadata?.[key] ?? data.customer?.metadata?.[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function eventProductId(data: PolarData): string | null {
  const id =
    typeof data.productId === "string"
      ? data.productId
      : typeof data.product?.id === "string"
        ? data.product.id
        : typeof data.subscription?.productId === "string"
          ? data.subscription.productId
          : null;
  return id && id.trim().length > 0 ? id.trim() : null;
}

/**
 * What the event is for, resolved from provider truth wherever possible.
 *
 * Metadata is treated as untrusted: an `offerKey` we stamped at checkout is only
 * honoured when the event carries no product id of its own, and is validated
 * against the registry before use. Whenever Polar tells us the product, that
 * wins — which is what stops a stale or forged metadata value from moving a
 * subscription onto an offer it never bought.
 */
interface EventOffer {
  /** The ProductSubscription.productKey this event belongs to. */
  subscriptionProductKey: string;
  /** Registry offer key, or a legacy plan key. */
  offerKey: string;
  interval: BillingIntervalKey | null;
  legacy: boolean;
}

function resolveEventOffer(
  data: PolarData,
): { kind: "resolved"; offer: EventOffer } | { kind: "unknown_product" } | { kind: "no_product" } {
  const productId = eventProductId(data);

  if (productId) {
    const resolved = resolveOfferFromProviderProductId(productId);
    if (!resolved) return { kind: "unknown_product" };
    return {
      kind: "resolved",
      offer: resolved.legacy
        ? {
            subscriptionProductKey: resolved.subscriptionProductKey,
            offerKey: resolved.legacyKey,
            interval: null,
            legacy: true,
          }
        : {
            subscriptionProductKey: resolved.subscriptionProductKey,
            offerKey: resolved.offer,
            interval: resolved.interval,
            legacy: false,
          },
    };
  }

  // No product on the event (common for checkout.* and customer.state_changed).
  // Fall back to the offer we stamped into our own checkout metadata.
  const metadataOffer = metadataValue(data, "offerKey") ?? metadataValue(data, "productKey");
  if (metadataOffer && isOfferKey(metadataOffer)) {
    const interval = metadataValue(data, "billingInterval");
    return {
      kind: "resolved",
      offer: {
        subscriptionProductKey: metadataOffer,
        offerKey: metadataOffer,
        interval: isBillingIntervalKey(interval) ? interval : null,
        legacy: false,
      },
    };
  }

  return { kind: "no_product" };
}

/** Whether an event may act on a given local row. */
function eventMatchesRow(
  event: { kind: "resolved"; offer: EventOffer } | { kind: "no_product" },
  row: { productKey: string },
): boolean {
  // Without any product signal we rely entirely on the strong id lookup that
  // found the row, so there is nothing further to verify.
  if (event.kind === "no_product") return true;
  return event.offer.subscriptionProductKey === row.productKey;
}

async function findSubscriptionForPolarData(
  data: PolarData,
  event: { kind: "resolved"; offer: EventOffer } | { kind: "no_product" },
) {
  // 1. The subscription id we stamped into checkout metadata. Strongest link,
  //    still verified against the event's product so stale metadata pointing at
  //    another row cannot hijack it.
  const metadataSubId = metadataValue(data, "productSubscriptionId");
  if (metadataSubId) {
    const sub = await prisma.productSubscription.findUnique({
      where: { id: metadataSubId },
      include: { preferences: true },
    });
    if (sub && eventMatchesRow(event, sub)) return sub;
  }

  // 2. A provider subscription id we have already recorded. Product-agnostic on
  //    purpose: this is how an in-place plan change (Article → bundle) keeps
  //    resolving to the same row after its product changed at Polar.
  const providerSubscriptionId =
    typeof data.subscriptionId === "string"
      ? data.subscriptionId
      : typeof data.id === "string"
        ? data.id
        : null;
  if (providerSubscriptionId) {
    const sub = await prisma.productSubscription.findFirst({
      where: { providerSubscriptionId },
      include: { preferences: true },
    });
    if (sub) return sub;
  }

  // Remaining fallbacks need to know which row the event is for.
  if (event.kind === "no_product") return null;
  const productKey = event.offer.subscriptionProductKey;

  const contactId =
    metadataValue(data, "contactId") ??
    (typeof data.customer?.externalId === "string" ? data.customer.externalId : null) ??
    (typeof data.externalCustomerId === "string" ? data.externalCustomerId : null);
  if (contactId) {
    const sub = await prisma.productSubscription.findUnique({
      where: { contactId_productKey: { contactId, productKey } },
      include: { preferences: true },
    });
    if (sub) return sub;
  }

  const email =
    metadataValue(data, "email") ??
    (typeof data.customer?.email === "string" ? data.customer.email.toLowerCase() : null);
  if (!email) return null;
  const contact = await prisma.contact.findUnique({
    where: { email },
    include: {
      subscriptions: { where: { productKey }, include: { preferences: true }, take: 1 },
    },
  });
  return contact?.subscriptions[0] ?? null;
}

function isBillingLifecycleType(type: string): boolean {
  return (
    type.startsWith("checkout.") ||
    type.startsWith("order.") ||
    type.startsWith("subscription.") ||
    type === "customer.state_changed"
  );
}

/**
 * Applies a verified Polar webhook to local billing state.
 *
 * Safety properties, all covered by tests in polar.test.ts:
 *
 *   • Stale events are dropped. `billingStateUpdatedAt` holds the provider
 *     timestamp of the last applied event, so an out-of-order delivery cannot
 *     regress a subscription to an earlier state.
 *   • Unknown products are never applied. A product id we cannot resolve
 *     returns `unrecognized_product` and leaves existing entitlement intact —
 *     it is never assumed to be the bundle.
 *   • Offer identity only ever strengthens. `improveClassification` refuses to
 *     replace provider-derived identity with a weaker inference, so a later
 *     event carrying no product cannot erase what an earlier one established.
 *   • One contact may own many subscriptions. Rows are located per
 *     (contact, productKey) or by provider subscription id, never "the
 *     contact's subscription", so buying a second product cannot overwrite the
 *     first or duplicate the Contact.
 */
export async function applyPolarWebhookPayload(payload: {
  type: string;
  timestamp: Date;
  data: PolarData;
}): Promise<PolarWebhookResult> {
  const { type, data } = payload;
  const seenProductId = eventProductId(data);

  if (!isBillingLifecycleType(type)) {
    return { outcome: "ignored_event_type", subscriptionId: null, providerProductId: seenProductId };
  }

  const resolved = resolveEventOffer(data);
  if (resolved.kind === "unknown_product") {
    // Recognisably a Polar product, but not one of ours. Applying it would mean
    // guessing at grants; leaving it alone costs nothing and is reversible once
    // the product id is configured.
    return {
      outcome: "unrecognized_product",
      subscriptionId: null,
      providerProductId: seenProductId,
    };
  }

  const sub = await findSubscriptionForPolarData(data, resolved);
  if (!sub) {
    return { outcome: "no_subscription", subscriptionId: null, providerProductId: seenProductId };
  }

  if (
    sub.billingStateUpdatedAt &&
    payload.timestamp.getTime() < sub.billingStateUpdatedAt.getTime()
  ) {
    return { outcome: "ignored_stale", subscriptionId: sub.id, providerProductId: seenProductId };
  }

  const update: Record<string, any> = {
    paymentProvider: PROVIDER,
    billingStateUpdatedAt: payload.timestamp,
  };

  // Persist offer identity, but only when it is at least as strong as what the
  // row already holds.
  const improvement = improveClassification(sub, seenProductId);
  if (improvement.improved) Object.assign(update, improvement.data);

  const customerId = data.customerId ?? data.customer?.id;
  if (typeof customerId === "string") update.providerCustomerId = customerId;

  if (type.startsWith("checkout.")) {
    update.providerCheckoutSessionId = data.id;
  }

  if (type.startsWith("order.")) {
    if (typeof data.checkoutId === "string") {
      update.providerCheckoutSessionId = data.checkoutId;
    }
    if (typeof data.subscriptionId === "string") {
      update.providerSubscriptionId = data.subscriptionId;
    }
    if (type === "order.paid" || data.paid === true || data.status === "paid") {
      update.paidAt = payload.timestamp;
      if (data.subscriptionId) update.status = "ACTIVE_PAID";
    }
  }

  if (type.startsWith("subscription.")) {
    update.providerSubscriptionId = data.id;
    if (typeof data.checkoutId === "string") {
      update.providerCheckoutSessionId = data.checkoutId;
    }
    update.status =
      type === "subscription.revoked"
        ? "EXPIRED"
        : type === "subscription.past_due"
          ? "PAST_DUE"
          : mapPolarSubscriptionStatus(String(data.status));
    // Interval preference mirrors identity: the resolved provider product pins
    // it exactly, the raw recurringInterval is the fallback, and the existing
    // plan survives when Polar sends something we do not model.
    update.plan =
      (resolved.kind === "resolved" ? resolved.offer.interval : null) ??
      planFromInterval(String(data.recurringInterval ?? "")) ??
      sub.plan;
    update.currentPeriodStart = data.currentPeriodStart ?? null;
    update.currentPeriodEnd = data.currentPeriodEnd ?? data.endsAt ?? null;
    update.trialStartedAt = data.trialStart ?? null;
    update.trialEndsAt = data.trialEnd ?? null;
    update.trialUsedAt = data.trialStart ? data.trialStart : sub.trialUsedAt;
    update.cancelAtPeriodEnd = Boolean(data.cancelAtPeriodEnd);
    update.canceledAt = data.canceledAt ?? null;
    update.pastDueAt = type === "subscription.past_due" ? payload.timestamp : null;
    if (data.status === "active" || type === "subscription.active") {
      update.paidAt = sub.paidAt ?? payload.timestamp;
    }
  }

  await prisma.productSubscription.update({
    where: { id: sub.id },
    data: update,
  });

  // A confirmed provider state is what completes a pending plan change. Kept
  // after the subscription write so transition bookkeeping can never block or
  // partially apply a billing update.
  await settleTransitionsForSubscription({
    subscriptionId: sub.id,
    providerProductId: seenProductId,
    status: typeof update.status === "string" ? update.status : sub.status,
  });

  return { outcome: "applied", subscriptionId: sub.id, providerProductId: seenProductId };
}

/* ============================ provider mutations ============================ */

/**
 * The real in-place plan change against Polar.
 *
 * Injected into `startTransition` as a `ProviderPlanChange` so the transition
 * rules can be tested end to end without a network call. It returns the
 * provider's own view of the subscription after the change — never an
 * optimistic guess — because whether the change took effect now or was deferred
 * to the next period is Polar's decision, not ours.
 */
export const polarPlanChange: ProviderPlanChange = async ({
  providerSubscriptionId,
  providerProductId,
  prorationBehavior,
}) => {
  assertPolarConfigured("Polar plan change");

  const updated = await getPolarClient().subscriptions.update({
    id: providerSubscriptionId,
    subscriptionUpdate: { productId: providerProductId, prorationBehavior },
  });

  return {
    productId:
      typeof updated.productId === "string"
        ? updated.productId
        : ((updated as { product?: { id?: string } }).product?.id ?? null),
    status: updated.status ? String(updated.status) : null,
    currentPeriodEnd: updated.currentPeriodEnd ?? null,
    cancelAtPeriodEnd: Boolean(updated.cancelAtPeriodEnd),
  };
};
