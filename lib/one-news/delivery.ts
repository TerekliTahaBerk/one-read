import { prisma } from "@/lib/prisma";
import { sendDailyEmail } from "@/lib/resend";
import { resolveProductEntitlement } from "@/lib/products/entitlements";
import { PRODUCT_ONE_NEWS } from "@/lib/products/registry";
import {
  MAX_AUTOMATIC_DELIVERY_ATTEMPTS,
  PROVIDER_IDEMPOTENCY_TTL_MS,
} from "@/lib/one-article/editorial";
export { PROVIDER_IDEMPOTENCY_TTL_MS } from "@/lib/one-article/editorial";
import { buildOneNewsRenderModel } from "./render-model";
import { renderOneNewsEmail } from "./email";
import { validateOneNewsIssue } from "./validation";

export interface OneNewsDispatchResult {
  issues: number;
  recipients: number;
  sent: number;
  failed: number;
  skipped: number;
}

export interface OneNewsDispatchOptions {
  now?: Date;
  send?: typeof sendDailyEmail;
  afterProviderAccepted?: () => Promise<void> | void;
}

export function oneNewsDeliveryIdempotencyKey(issueId: string, contactId: string): string {
  return `onenews-${issueId}-${contactId}`;
}

export function resolveOneNewsIssueDeliveryStatus(
  sent: number,
  unresolved: number,
): "SENT" | "PARTIALLY_FAILED" | "FAILED" {
  if (unresolved === 0) return "SENT";
  return sent > 0 ? "PARTIALLY_FAILED" : "FAILED";
}

export async function dispatchDueOneNewsIssues(
  now = new Date(),
  options: OneNewsDispatchOptions = {},
): Promise<OneNewsDispatchResult> {
  await prisma.oneNewsIssue.updateMany({
    where: { status: "SENDING", claimedAt: { lt: new Date(now.getTime() - 15 * 60 * 1000) } },
    data: { status: "SCHEDULED", claimedAt: null },
  });
  const due = await prisma.oneNewsIssue.findMany({
    where: { status: "SCHEDULED", scheduledFor: { lte: now }, readyAt: { not: null } },
    orderBy: { scheduledFor: "asc" },
    take: 10,
  });
  const total: OneNewsDispatchResult = { issues: 0, recipients: 0, sent: 0, failed: 0, skipped: 0 };
  for (const issue of due) {
    const claimed = await prisma.oneNewsIssue.updateMany({
      where: { id: issue.id, status: "SCHEDULED", readyAt: { not: null }, scheduledFor: { lte: now } },
      data: { status: "SENDING", claimedAt: now },
    });
    if (claimed.count !== 1) continue;
    total.issues++;
    const result = await dispatchOneNewsIssue(issue.id, { ...options, now });
    total.recipients += result.recipients;
    total.sent += result.sent;
    total.failed += result.failed;
    total.skipped += result.skipped;
  }
  return total;
}

export async function dispatchOneNewsIssue(
  issueId: string,
  options: OneNewsDispatchOptions = {},
): Promise<Omit<OneNewsDispatchResult, "issues">> {
  const now = options.now ?? new Date();
  const send = options.send ?? sendDailyEmail;
  const issue = await prisma.oneNewsIssue.findUniqueOrThrow({
    where: { id: issueId },
    include: { sources: true, corrections: true },
  });
  if (issue.status !== "SENDING" || !issue.readyAt || !issue.scheduledFor || issue.scheduledFor > now) {
    throw new Error("issue_not_dispatchable");
  }
  const validation = validateOneNewsIssue(issue, issue.sources, now);
  if (!validation.valid) throw new Error(`issue_invalid:${validation.errors[0]?.code ?? "unknown"}`);
  // Rendering is a precondition, not something first attempted after a provider call.
  const model = buildOneNewsRenderModel(issue, issue.sources, issue.corrections);
  const recipients = await eligibleOneNewsRecipients(issue.readingLanguage, now);
  const eligibleIds = recipients.map((recipient) => recipient.contact.id);
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  const noLongerEligible = await prisma.oneNewsDelivery.updateMany({
    where: {
      issueId,
      status: { in: ["QUEUED", "SENDING", "FAILED"] },
      ...(eligibleIds.length ? { contactId: { notIn: eligibleIds } } : {}),
    },
    data: { status: "SKIPPED", skippedReason: "no_longer_eligible", failedReason: null },
  });
  skipped += noLongerEligible.count;

  for (const recipient of recipients) {
    const delivery = await prisma.oneNewsDelivery.upsert({
      where: { issueId_contactId: { issueId, contactId: recipient.contact.id } },
      create: {
        issueId,
        contactId: recipient.contact.id,
        productSubscriptionId: recipient.preference.id,
      },
      update: {},
    });
    if (delivery.status === "SENT" || delivery.status === "SKIPPED") { skipped++; continue; }
    if (delivery.status === "RECONCILIATION_REQUIRED") { failed++; continue; }
    if (delivery.status === "SENDING" && delivery.lastAttemptAt &&
        now.getTime() - delivery.lastAttemptAt.getTime() >= PROVIDER_IDEMPOTENCY_TTL_MS) {
      await prisma.oneNewsDelivery.update({
        where: { id: delivery.id },
        data: {
          status: "RECONCILIATION_REQUIRED",
          reconciliationRequiredAt: now,
          failedReason: "provider_outcome_ambiguous_outside_idempotency_window",
        },
      });
      failed++;
      continue;
    }
    const deliberateAttemptAfterExhaustion = Boolean(
      delivery.manualRecoveryAt &&
      (!delivery.lastAttemptAt || delivery.manualRecoveryAt > delivery.lastAttemptAt),
    );
    if (delivery.attemptCount >= MAX_AUTOMATIC_DELIVERY_ATTEMPTS && !deliberateAttemptAfterExhaustion) {
      failed++;
      continue;
    }

    await prisma.oneNewsDelivery.update({
      where: { id: delivery.id },
      data: { status: "SENDING", attemptCount: { increment: 1 }, lastAttemptAt: now, failedReason: null },
    });
    let providerAccepted = false;
    try {
      const base = (process.env.PUBLIC_BASE_URL || "https://oneread.email").replace(/\/$/, "");
      const unsubscribe = `${base}/unsubscribe?subscription=${encodeURIComponent(recipient.preference.unsubscribeToken)}`;
      const rendered = renderOneNewsEmail(model, { unsubscribe });
      const response = await send({
        to: recipient.contact.email,
        subject: rendered.subject,
        text: rendered.text,
        html: rendered.html,
        idempotencyKey: oneNewsDeliveryIdempotencyKey(issue.id, recipient.contact.id),
        unsubscribeUrl: `${base}/api/unsubscribe?subscription=${encodeURIComponent(recipient.preference.unsubscribeToken)}`,
      });
      providerAccepted = true;
      await options.afterProviderAccepted?.();
      await prisma.oneNewsDelivery.update({
        where: { id: delivery.id },
        data: {
          providerAcceptedAt: now,
          providerMessageId: response.messageId ?? null,
          providerStatus: "ACCEPTED",
          providerStatusAt: now,
        },
      });
      await prisma.$transaction([
        prisma.oneNewsDelivery.update({ where: { id: delivery.id }, data: { status: "SENT", sentAt: now } }),
        prisma.productSubscription.update({ where: { id: recipient.preference.id }, data: { lastSentAt: now } }),
      ]);
      sent++;
    } catch (error) {
      await prisma.oneNewsDelivery.update({
        where: { id: delivery.id },
        data: {
          status: providerAccepted ? "SENDING" : "FAILED",
          providerAcceptedAt: providerAccepted ? now : undefined,
          failedReason: providerAccepted
            ? "provider_accepted_local_persistence_failed"
            : safeError(error),
        },
      });
      failed++;
    }
  }

  const [sentTotal, unresolved] = await Promise.all([
    prisma.oneNewsDelivery.count({ where: { issueId, status: "SENT" } }),
    prisma.oneNewsDelivery.count({
      where: { issueId, status: { in: ["QUEUED", "SENDING", "FAILED", "RECONCILIATION_REQUIRED"] } },
    }),
  ]);
  await prisma.oneNewsIssue.update({
    where: { id: issueId },
    data: {
      status: resolveOneNewsIssueDeliveryStatus(sentTotal, unresolved),
      sentAt: unresolved === 0 ? now : null,
    },
  });
  return { recipients: recipients.length, sent, failed, skipped };
}

export async function eligibleOneNewsRecipients(readingLanguage: string, now = new Date()) {
  // One query fetches all candidate offer rows plus every row needed by the
  // centralized entitlement resolver. An explicit OneNews row is the product
  // email preference; otherwise the granting bundle row is the fallback.
  const contacts = await prisma.contact.findMany({
    where: {
      subscriptions: {
        some: { productKey: { in: ["one-news", "one-read"] }, emailDeliveryStatus: "SUBSCRIBED" },
      },
    },
    include: { subscriptions: { include: { preferences: true } } },
  });
  return contacts.flatMap((contact) => {
    if (!resolveProductEntitlement(contact.subscriptions, PRODUCT_ONE_NEWS, now).granted) return [];
    const explicit = contact.subscriptions.find((row) => row.productKey === PRODUCT_ONE_NEWS);
    const preference = explicit ?? contact.subscriptions.find(
      (row) => row.productKey === "one-read" && row.emailDeliveryStatus === "SUBSCRIBED",
    );
    if (!preference || preference.emailDeliveryStatus !== "SUBSCRIBED") return [];
    const languageMatches = contact.subscriptions.some(
      (row) => row.preferences?.summaryLanguage === readingLanguage,
    );
    if (!languageMatches) return [];
    return [{ contact: { id: contact.id, email: contact.email }, preference }];
  });
}

export async function retryFailedOneNewsIssue(issueId: string, actor: string): Promise<void> {
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    const reset = await tx.oneNewsDelivery.updateMany({
      where: { issueId, status: "FAILED" },
      data: { status: "QUEUED", manualRecoveryAt: now, manualRecoveryBy: actor, failedReason: null },
    });
    if (!reset.count) throw new Error("no_failed_deliveries");
    await tx.oneNewsIssue.update({
      where: { id: issueId },
      data: { status: "SCHEDULED", scheduledFor: now, claimedAt: null, updatedBy: actor },
    });
  });
}

export async function recoverAmbiguousOneNewsIssue(issueId: string, actor: string): Promise<void> {
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    const reset = await tx.oneNewsDelivery.updateMany({
      where: { issueId, status: "RECONCILIATION_REQUIRED" },
      data: {
        status: "QUEUED", reconciliationRequiredAt: null,
        manualRecoveryAt: now, manualRecoveryBy: actor, failedReason: null,
      },
    });
    if (!reset.count) throw new Error("no_ambiguous_deliveries");
    await tx.oneNewsIssue.update({
      where: { id: issueId },
      data: { status: "SCHEDULED", scheduledFor: now, claimedAt: null, updatedBy: actor },
    });
  });
}

function safeError(error: unknown): string {
  return (error instanceof Error ? error.message : "delivery_failed").slice(0, 1000);
}
