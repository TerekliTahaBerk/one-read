import { prisma } from "@/lib/prisma";
import { needsReconciliation } from "@/lib/billing/polar";
import { maskCorrelationId } from "@/lib/billing/reconciliation";
import { describeDeliveryFailure } from "@/lib/admin/delivery-recovery";

export type OperatorQueueCategory =
  | "delivery-retryable"
  | "delivery-reconciliation"
  | "provider-unresolved"
  | "billing-reconciliation"
  | "cron-failed";

export type OperatorQueueItem = {
  id: string;
  category: OperatorQueueCategory;
  subsystem: "delivery" | "billing" | "cron";
  product: string;
  occurredAt: Date;
  reason: string;
  state: string;
  correlation: string;
  nextAction: string;
  action?: { kind: "retry-delivery"; product: "one-article" | "one-news"; deliveryId: string };
};

const deliverySelect = {
  id: true, status: true, providerStatus: true, providerMessageId: true,
  providerAcceptedAt: true, providerStatusAt: true, attemptCount: true,
  failedReason: true, updatedAt: true,
  productSubscription: { select: { status: true, emailDeliveryStatus: true } },
} as const;

export function isSafeDeliveryRetry(row: {
  status: string; providerStatus: string | null; providerAcceptedAt: Date | null;
  subscriptionStatus: string; emailDeliveryStatus: string;
}): boolean {
  return row.status === "FAILED"
    && !row.providerAcceptedAt
    && !["BOUNCED", "COMPLAINED", "DELAYED"].includes(row.providerStatus ?? "")
    && row.emailDeliveryStatus === "SUBSCRIBED"
    && !["CANCELED", "INACTIVE"].includes(row.subscriptionStatus);
}

function deliveryItem(product: "one-article" | "one-news", row: any): OperatorQueueItem {
  const verdict = describeDeliveryFailure(row);
  const acceptedUnresolved = Boolean(row.providerAcceptedAt) && !["DELIVERED", "FAILED", "BOUNCED", "COMPLAINED"].includes(row.providerStatus ?? "");
  const ambiguous = row.status === "RECONCILIATION_REQUIRED";
  const category: OperatorQueueCategory = ambiguous
    ? "delivery-reconciliation"
    : acceptedUnresolved ? "provider-unresolved" : "delivery-retryable";
  const eligible = row.productSubscription.emailDeliveryStatus === "SUBSCRIBED"
    && !["CANCELED", "INACTIVE"].includes(row.productSubscription.status);
  const safeRetry = category === "delivery-retryable" && verdict.safeToRetry && isSafeDeliveryRetry({
    status: row.status, providerStatus: row.providerStatus, providerAcceptedAt: row.providerAcceptedAt,
    subscriptionStatus: row.productSubscription.status, emailDeliveryStatus: row.productSubscription.emailDeliveryStatus,
  });
  return {
    id: `${product}:${row.id}`,
    category,
    subsystem: "delivery",
    product,
    occurredAt: row.providerStatusAt ?? row.updatedAt,
    reason: verdict.what,
    state: `${row.status} / ${row.providerStatus ?? "NO_PROVIDER_EVENT"}`,
    correlation: maskCorrelationId(row.providerMessageId) ?? maskCorrelationId(row.id) ?? "masked",
    nextAction: safeRetry
      ? "Safe retry (eligibility and state are re-checked atomically)"
      : ambiguous || acceptedUnresolved
        ? "Reconcile in Resend first; automatic resend is prohibited"
        : eligible ? verdict.recovery : "Recipient is no longer eligible; do not resend",
    action: safeRetry ? { kind: "retry-delivery", product, deliveryId: row.id } : undefined,
  };
}

export async function loadOperatorQueue(category?: string): Promise<OperatorQueueItem[]> {
  const [articles, news, billing, runs] = await Promise.all([
    prisma.oneArticleDelivery.findMany({
      where: { OR: [
        { status: { in: ["FAILED", "RECONCILIATION_REQUIRED"] } },
        { providerAcceptedAt: { not: null }, providerStatus: { in: ["ACCEPTED", "DELAYED"] } },
        { providerAcceptedAt: { not: null }, providerStatus: null, status: { not: "SENT" } },
      ] }, select: deliverySelect, orderBy: { updatedAt: "desc" }, take: 100,
    }),
    prisma.oneNewsDelivery.findMany({
      where: { OR: [
        { status: { in: ["FAILED", "RECONCILIATION_REQUIRED"] } },
        { providerAcceptedAt: { not: null }, providerStatus: { in: ["ACCEPTED", "DELAYED"] } },
        { providerAcceptedAt: { not: null }, providerStatus: null, status: { not: "SENT" } },
      ] }, select: deliverySelect, orderBy: { updatedAt: "desc" }, take: 100,
    }),
    prisma.billingEvent.findMany({ orderBy: { createdAt: "desc" }, take: 250,
      select: { id: true, providerEventId: true, type: true, outcome: true, createdAt: true } }),
    prisma.operationalRun.findMany({ where: { status: "FAILED" }, orderBy: { startedAt: "desc" }, take: 100,
      select: { id: true, productKey: true, route: true, startedAt: true, error: true, failedCount: true, generatedCount: true, sentCount: true, skippedCount: true } }),
  ]);

  const items: OperatorQueueItem[] = [
    ...articles.map((row) => deliveryItem("one-article", row)),
    ...news.map((row) => deliveryItem("one-news", row)),
    ...billing.filter((row) => needsReconciliation(row.outcome)).map((row) => ({
      id: `billing:${row.id}`, category: "billing-reconciliation" as const, subsystem: "billing" as const,
      product: "one-read", occurredAt: row.createdAt,
      reason: row.outcome === "no_subscription" ? "Provider event has no local subscription" : "Provider product is not recognized",
      state: `${row.type} / ${row.outcome}`, correlation: maskCorrelationId(row.providerEventId) ?? "masked",
      nextAction: "Diagnose with Phase 1 billing reconciliation; apply only its preconditioned repair",
    })),
    ...runs.map((row) => ({
      id: `cron:${row.id}`, category: "cron-failed" as const, subsystem: "cron" as const,
      product: row.productKey, occurredAt: row.startedAt,
      reason: (row.error || "Operational run failed").slice(0, 180), state: "FAILED",
      correlation: maskCorrelationId(row.id) ?? "masked",
      nextAction: `Inspect run; affected ${row.failedCount || row.generatedCount + row.sentCount + row.skippedCount}`,
    })),
  ];
  return items.filter((item) => !category || category === "all" || item.category === category)
    .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
}

export async function retryQueuedDelivery(input: {
  product: "one-article" | "one-news"; deliveryId: string; actor: string;
}): Promise<{ issueId: string }> {
  const now = new Date();
  return prisma.$transaction(async (tx) => {
    const delegate = input.product === "one-article" ? tx.oneArticleDelivery : tx.oneNewsDelivery;
    const current = await (delegate as any).findUnique({ where: { id: input.deliveryId }, select: {
      id: true, issueId: true, status: true, providerStatus: true, providerAcceptedAt: true,
      productSubscription: { select: { status: true, emailDeliveryStatus: true } },
    } });
    if (!current) throw new Error("queue_item_not_found");
    const eligible = current.productSubscription.emailDeliveryStatus === "SUBSCRIBED"
      && !["CANCELED", "INACTIVE"].includes(current.productSubscription.status);
    const hardFailed = isSafeDeliveryRetry({
      status: current.status, providerStatus: current.providerStatus, providerAcceptedAt: current.providerAcceptedAt,
      subscriptionStatus: current.productSubscription.status, emailDeliveryStatus: current.productSubscription.emailDeliveryStatus,
    });
    if (!eligible) throw new Error("recipient_no_longer_eligible");
    if (!hardFailed) throw new Error("stale_or_unsafe_queue_action");
    const reset = await (delegate as any).updateMany({
      where: { id: input.deliveryId, status: "FAILED", providerAcceptedAt: null },
      data: { status: "QUEUED", attemptCount: 0, failedReason: null, manualRecoveryAt: now, manualRecoveryBy: input.actor },
    });
    if (reset.count !== 1) throw new Error("stale_or_concurrent_queue_action");
    if (input.product === "one-article") {
      await tx.oneArticleIssue.update({ where: { id: current.issueId }, data: {
        status: "SCHEDULED", scheduledFor: now, claimedAt: null, updatedBy: input.actor,
        version: { increment: 1 },
      } });
    } else {
      await tx.oneNewsIssue.update({ where: { id: current.issueId }, data: {
        status: "SCHEDULED", scheduledFor: now, claimedAt: null, updatedBy: input.actor,
      } });
    }
    await tx.adminAuditLog.create({ data: {
      actor: input.actor, action: "operatorQueue.delivery.retry", targetType: input.product,
      targetId: input.deliveryId, metadata: { before: "FAILED", after: "QUEUED", issueId: current.issueId },
    } });
    return { issueId: current.issueId };
  });
}
