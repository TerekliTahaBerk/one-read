import { prisma } from "@/lib/prisma";
import { classifySubscription } from "@/lib/products/classification";
import type { OfferKey } from "@/lib/products/registry";

export const LAUNCH_HEALTH_OFFERS = ["all", "one-article", "one-news", "one-read"] as const;
export type LaunchHealthOffer = (typeof LAUNCH_HEALTH_OFFERS)[number];

export interface LaunchHealthStage {
  key: string;
  label: string;
  count: number;
  evidence: string;
}

export interface LaunchHealthSnapshot {
  offer: LaunchHealthOffer;
  stages: LaunchHealthStage[];
  failures: {
    deliveryFailed: number;
    reconciliationRequired: number;
    unprocessedBillingEvents: number;
    failedOperationalRuns: number;
  };
  latestRun: { productKey: string; status: string; startedAt: Date; finishedAt: Date | null } | null;
  generatedAt: Date;
}

type SubscriptionEvidence = {
  id: string;
  productKey: string;
  offerKey: string | null;
  providerProductId: string | null;
  plan: string | null;
  status: string;
  paymentProvider: string | null;
  providerSubscriptionId: string | null;
  providerCheckoutSessionId: string | null;
};

/** Resolve the commercial offer without treating an unidentified legacy one-read row as today's bundle. */
export function evidenceOffer(row: SubscriptionEvidence): OfferKey | null {
  const classification = classifySubscription(row);
  return classification.kind === "current" ? classification.offer : null;
}

function inScope(row: SubscriptionEvidence, offer: LaunchHealthOffer): boolean {
  const classified = evidenceOffer(row);
  return classified !== null && (offer === "all" || classified === offer);
}

function verificationOffer(intent: string | null): OfferKey | null {
  const match = intent?.match(/^checkout:(one-article|one-news|one-read):(monthly|annual)$/);
  return (match?.[1] as OfferKey | undefined) ?? null;
}

/**
 * Launch decision snapshot. Billing and delivery stages come only from durable,
 * server-authored state; browser analytics is intentionally not queried here.
 */
export async function getLaunchHealth(offer: LaunchHealthOffer = "all"): Promise<LaunchHealthSnapshot> {
  const runWhere = offer === "all"
    ? {}
    : offer === "one-read"
      ? { productKey: { in: ["one-article", "one-news"] } }
      : { productKey: offer };
  const [subscriptions, verificationRows, articleDeliveries, newsDeliveries, unprocessedBillingEvents, failedOperationalRuns, latestRun] = await Promise.all([
    prisma.productSubscription.findMany({
      select: {
        id: true, productKey: true, offerKey: true, providerProductId: true, plan: true,
        status: true, paymentProvider: true, providerSubscriptionId: true,
        providerCheckoutSessionId: true,
      },
    }),
    prisma.emailVerificationCode.findMany({ select: { consumedAt: true, intent: true } }),
    prisma.oneArticleDelivery.findMany({
      select: { status: true, providerStatus: true, productSubscriptionId: true },
    }),
    prisma.oneNewsDelivery.findMany({
      select: { status: true, providerStatus: true, productSubscriptionId: true },
    }),
    prisma.billingEvent.count({ where: { processedAt: null } }),
    prisma.operationalRun.count({ where: { ...runWhere, status: { in: ["FAILED", "PARTIAL"] } } }),
    prisma.operationalRun.findFirst({
      where: runWhere,
      orderBy: { startedAt: "desc" },
      select: { productKey: true, status: true, startedAt: true, finishedAt: true },
    }),
  ]);

  const scoped = subscriptions.filter((row) => inScope(row, offer));
  const scopedIds = new Set(scoped.map((row) => row.id));
  const verifications = verificationRows.filter((row) => {
    const rowOffer = verificationOffer(row.intent);
    return offer === "all" || rowOffer === offer;
  });
  const deliveries = [...articleDeliveries, ...newsDeliveries].filter((row) => scopedIds.has(row.productSubscriptionId));
  const acceptedSubscriptionIds = new Set(deliveries
    .filter((row) => row.status === "SENT" || row.providerStatus === "ACCEPTED" || row.providerStatus === "DELIVERED")
    .map((row) => row.productSubscriptionId));

  return {
    offer,
    stages: [
      { key: "setup", label: "Setup started", count: scoped.length, evidence: "ProductSubscription row" },
      { key: "verification_requested", label: "Verification requested", count: verifications.length, evidence: "EmailVerificationCode row" },
      { key: "verification_confirmed", label: "Verification confirmed", count: verifications.filter((row) => row.consumedAt !== null).length, evidence: "Consumed verification code" },
      { key: "checkout_created", label: "Checkout created", count: scoped.filter((row) => row.providerCheckoutSessionId !== null).length, evidence: "Provider checkout ID" },
      { key: "entitlement", label: "Paid entitlement confirmed", count: scoped.filter((row) => row.status === "ACTIVE_PAID" && row.paymentProvider !== null && row.providerSubscriptionId !== null).length, evidence: "Provider-confirmed ACTIVE_PAID" },
      { key: "first_delivery", label: "First delivery accepted", count: acceptedSubscriptionIds.size, evidence: "Canonical delivery/provider state" },
    ],
    failures: {
      deliveryFailed: deliveries.filter((row) => row.status === "FAILED" || row.providerStatus === "FAILED" || row.providerStatus === "BOUNCED").length,
      reconciliationRequired: deliveries.filter((row) => row.status === "RECONCILIATION_REQUIRED").length,
      unprocessedBillingEvents,
      failedOperationalRuns,
    },
    latestRun,
    generatedAt: new Date(),
  };
}
