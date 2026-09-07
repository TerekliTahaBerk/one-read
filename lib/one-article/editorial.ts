import { Prisma, type OneArticleIssue } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { SUMMARY_LANGUAGES } from "@/lib/options";
import { resolveOneArticleEligibilityForContacts } from "@/lib/oneread/access";
import { renderEditorialEmail } from "./editorial-email";
import { ResendDeliveryError, sendDailyEmail } from "@/lib/resend";
import { reportProviderEvent } from "@/lib/provider-observability";
import {
  validateEditorialDraft,
  validateEditorialIssue,
  type EditorialContentInput,
} from "./editorial-validation";

export const EDITORIAL_LANGUAGES = SUMMARY_LANGUAGES;
export const EDITORIAL_ISSUE_STATUSES = [
  "DRAFT",
  "READY",
  "SCHEDULED",
  "SENDING",
  "SENT",
  "PARTIALLY_FAILED",
  "FAILED",
  "CANCELED",
] as const;

export type EditorialIssueStatus = (typeof EDITORIAL_ISSUE_STATUSES)[number];

export type EditorialIssueInput = EditorialContentInput;

/** Resend retains idempotency keys for 24 hours. Keep this boundary in one
 * place so recovery code and tests cannot silently disagree. */
export const PROVIDER_IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;
export const DELIVERY_CLAIM_STALE_MS = 15 * 60 * 1000;
export const MAX_AUTOMATIC_DELIVERY_ATTEMPTS = 3;
const AUTOMATICALLY_DISPATCHABLE_STATUSES = [
  "SCHEDULED",
  "FAILED",
  "PARTIALLY_FAILED",
] as const;

export interface EditorialDispatchOptions {
  now?: Date;
  send?: typeof sendDailyEmail;
  /** Integration-test fault injection at the provider/database boundary. */
  afterProviderAccepted?: () => Promise<void> | void;
}

export async function createEditorialIssue(
  input: EditorialIssueInput,
  actor: string,
): Promise<OneArticleIssue> {
  const validation = validateEditorialDraft(input);
  if (!validation.ok) throw new Error(validation.error);
  return prisma.oneArticleIssue.create({
    data: normalizedIssueData(input, actor),
  });
}

export async function updateEditorialIssue(args: {
  id: string;
  version: number;
  input: EditorialIssueInput;
  actor: string;
}): Promise<OneArticleIssue> {
  const validation = validateEditorialDraft(args.input);
  if (!validation.ok) throw new Error(validation.error);
  const current = await prisma.oneArticleIssue.findUnique({ where: { id: args.id } });
  if (!current) throw new Error("issue_not_found");
  if (!["DRAFT", "READY"].includes(current.status)) throw new Error("issue_not_editable");
  const data = normalizedIssueData(args.input, args.actor);
  const { createdBy: _createdBy, ...updateData } = data;
  const updated = await prisma.oneArticleIssue.updateMany({
    where: { id: args.id, version: args.version },
    data: {
      ...updateData,
      version: { increment: 1 },
    },
  });
  if (updated.count !== 1) throw new Error("version_conflict");
  return prisma.oneArticleIssue.findUniqueOrThrow({ where: { id: args.id } });
}

export async function setEditorialIssueReady(id: string, actor: string): Promise<OneArticleIssue> {
  const issue = await prisma.oneArticleIssue.findUniqueOrThrow({ where: { id } });
  const validation = validateEditorialIssue(issue);
  if (!validation.ok) throw new Error(validation.error);
  if (!["DRAFT", "READY"].includes(issue.status)) throw new Error("invalid_status_transition");
  return prisma.oneArticleIssue.update({
    where: { id },
    data: { status: "READY", readyAt: new Date(), updatedBy: actor, version: { increment: 1 } },
  });
}

export async function scheduleEditorialIssue(args: {
  id: string;
  scheduledFor: Date;
  actor: string;
}): Promise<OneArticleIssue> {
  if (!Number.isFinite(args.scheduledFor.getTime())) throw new Error("invalid_schedule");
  if (args.scheduledFor.getTime() <= Date.now()) throw new Error("schedule_must_be_future");
  const issue = await prisma.oneArticleIssue.findUniqueOrThrow({ where: { id: args.id } });
  const validation = validateEditorialIssue(issue);
  if (!validation.ok) throw new Error(validation.error);
  if (!["DRAFT", "READY", "SCHEDULED"].includes(issue.status)) {
    throw new Error("invalid_status_transition");
  }
  return prisma.oneArticleIssue.update({
    where: { id: args.id },
    data: {
      status: "SCHEDULED",
      scheduledFor: args.scheduledFor,
      scheduledAt: new Date(),
      readyAt: issue.readyAt ?? new Date(),
      updatedBy: args.actor,
      canceledAt: null,
      version: { increment: 1 },
    },
  });
}

export async function cancelEditorialIssue(id: string, actor: string): Promise<OneArticleIssue> {
  const issue = await prisma.oneArticleIssue.findUniqueOrThrow({ where: { id } });
  if (!["DRAFT", "READY", "SCHEDULED", "FAILED", "PARTIALLY_FAILED"].includes(issue.status)) {
    throw new Error("invalid_status_transition");
  }
  return prisma.oneArticleIssue.update({
    where: { id },
    data: {
      status: "CANCELED",
      canceledAt: new Date(),
      updatedBy: actor,
      version: { increment: 1 },
    },
  });
}

export async function retryEditorialIssue(id: string, actor: string): Promise<OneArticleIssue> {
  const issue = await prisma.oneArticleIssue.findUniqueOrThrow({ where: { id } });
  if (!["FAILED", "PARTIALLY_FAILED"].includes(issue.status)) {
    throw new Error("invalid_status_transition");
  }
  const now = new Date();
  return prisma.$transaction(async (tx) => {
    // This admin action is the explicit recovery path after the automatic cap.
    // Ambiguous sends are deliberately excluded and require the separate,
    // higher-risk reconciliation action below.
    await tx.oneArticleDelivery.updateMany({
      where: { issueId: id, status: "FAILED" },
      data: {
        status: "QUEUED",
        attemptCount: 0,
        manualRecoveryAt: now,
        manualRecoveryBy: actor,
        failedReason: null,
      },
    });
    return tx.oneArticleIssue.update({
      where: { id },
      data: {
        status: "SCHEDULED",
        scheduledFor: now,
        scheduledAt: now,
        claimedAt: null,
        updatedBy: actor,
        version: { increment: 1 },
      },
    });
  });
}

/** Explicit operator authorization for a potentially duplicate resend. */
export async function recoverAmbiguousEditorialDeliveries(
  id: string,
  actor: string,
): Promise<OneArticleIssue> {
  const now = new Date();
  return prisma.$transaction(async (tx) => {
    const reset = await tx.oneArticleDelivery.updateMany({
      where: { issueId: id, status: "RECONCILIATION_REQUIRED" },
      data: {
        status: "QUEUED",
        attemptCount: 0,
        reconciliationRequiredAt: null,
        manualRecoveryAt: now,
        manualRecoveryBy: actor,
        failedReason: null,
      },
    });
    if (reset.count === 0) throw new Error("no_ambiguous_deliveries");
    return tx.oneArticleIssue.update({
      where: { id },
      data: {
        status: "SCHEDULED",
        scheduledFor: now,
        scheduledAt: now,
        claimedAt: null,
        updatedBy: actor,
        version: { increment: 1 },
      },
    });
  });
}

export async function duplicateEditorialIssue(id: string, actor: string): Promise<OneArticleIssue> {
  const source = await prisma.oneArticleIssue.findUniqueOrThrow({ where: { id } });
  return prisma.oneArticleIssue.create({
    data: {
      readingLanguage: source.readingLanguage,
      subject: source.subject,
      previewText: source.previewText,
      headline: source.headline,
      bodyText: source.bodyText,
      bodyHtml: source.bodyHtml,
      nativeContent: source.nativeContent ?? undefined,
      mobileEnabled: source.mobileEnabled,
      mobileExploreEnabled: source.mobileExploreEnabled,
      mobileListenEnabled: source.mobileListenEnabled,
      mobileTopics: source.mobileTopics,
      mobilePriority: source.mobilePriority,
      mobileDeck: source.mobileDeck,
      mobileAudioUrl: source.mobileAudioUrl,
      mobileAudioDurationSeconds: source.mobileAudioDurationSeconds,
      heroImageUrl: source.heroImageUrl,
      heroImageAlt: source.heroImageAlt,
      heroImageCredit: source.heroImageCredit,
      sourceTitle: source.sourceTitle,
      sourceName: source.sourceName,
      sourceUrl: source.sourceUrl,
      ctaLabel: source.ctaLabel,
      adminNotes: source.adminNotes,
      createdBy: actor,
      updatedBy: actor,
    },
  });
}

export async function countEligibleEditorialRecipients(readingLanguage: string): Promise<number> {
  const recipients = await eligibleRecipients(readingLanguage);
  return recipients.length;
}

export interface DispatchEditorialResult {
  issues: number;
  recipients: number;
  sent: number;
  failed: number;
  skipped: number;
  attempted: number;
  reconciliationRequired: number;
}

export function editorialDeliveryIdempotencyKey(
  issueId: string,
  contactId: string,
): string {
  return `onearticle-${issueId}-${contactId}`;
}

export function resolveEditorialIssueDeliveryStatus(
  sentTotal: number,
  unresolvedTotal: number,
): "SENT" | "PARTIALLY_FAILED" | "FAILED" {
  if (unresolvedTotal === 0) return "SENT";
  return sentTotal > 0 ? "PARTIALLY_FAILED" : "FAILED";
}

export async function dispatchDueEditorialIssues(
  now: Date = new Date(),
  options: EditorialDispatchOptions = {},
): Promise<DispatchEditorialResult> {
  // Recover a worker that died after claiming an edition. Per-recipient
  // idempotency keeps already-sent deliveries safe on the retry.
  await prisma.oneArticleIssue.updateMany({
    where: {
      status: "SENDING",
      claimedAt: { lt: new Date(now.getTime() - 15 * 60 * 1000) },
    },
    data: { status: "SCHEDULED", claimedAt: null },
  });
  const due = await prisma.oneArticleIssue.findMany({
    where: {
      status: { in: [...AUTOMATICALLY_DISPATCHABLE_STATUSES] },
      scheduledFor: { lte: now },
    },
    orderBy: { scheduledFor: "asc" },
    take: 10,
  });
  const total: DispatchEditorialResult = {
    issues: 0,
    recipients: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    attempted: 0,
    reconciliationRequired: 0,
  };
  for (const issue of due) {
    // `scheduledFor` is an absolute UTC instant. The weekday policy is applied
    // in the edition's IANA timezone so polling never sends a Friday edition
    // on Saturday after an outage. Europe/Istanbul is UTC+3 year-round.
    if (!isWeekdayInTimezone(now, issue.timezone)) continue;
    const claimed = await prisma.oneArticleIssue.updateMany({
      where: {
        id: issue.id,
        status: { in: [...AUTOMATICALLY_DISPATCHABLE_STATUSES] },
      },
      data: { status: "SENDING", claimedAt: now },
    });
    if (claimed.count !== 1) continue;
    total.issues++;
    const result = await dispatchIssue(issue.id, { ...options, now });
    total.recipients += result.recipients;
    total.sent += result.sent;
    total.failed += result.failed;
    total.skipped += result.skipped;
    total.attempted += result.attempted;
    total.reconciliationRequired += result.reconciliationRequired;
  }
  return total;
}

export async function dispatchIssue(
  issueId: string,
  options: EditorialDispatchOptions = {},
): Promise<Omit<DispatchEditorialResult, "issues">> {
  const now = options.now ?? new Date();
  const send = options.send ?? sendDailyEmail;
  const issue = await prisma.oneArticleIssue.findUniqueOrThrow({ where: { id: issueId } });
  const recipients = await eligibleRecipients(issue.readingLanguage);
  const eligibleContactIds = recipients.map((recipient) => recipient.contact.id);
  let sent = 0;
  let failed = 0;
  let skipped = 0;
  let attempted = 0;
  let reconciliationRequired = 0;

  // A previously failed recipient may have unsubscribed or lost access before
  // an admin retry. Resolve those rows explicitly instead of leaving the
  // edition permanently failed or attempting an unauthorized delivery.
  const noLongerEligible = await prisma.oneArticleDelivery.updateMany({
    where: {
      issueId,
      status: { in: ["QUEUED", "SENDING", "FAILED"] },
      ...(eligibleContactIds.length > 0
        ? { contactId: { notIn: eligibleContactIds } }
        : {}),
    },
    data: {
      status: "SKIPPED",
      skippedReason: "no_longer_eligible",
      failedReason: null,
    },
  });
  skipped += noLongerEligible.count;

  for (const recipient of recipients) {
    const delivery = await findOrCreateDelivery(
      issueId,
      recipient.contact.id,
      recipient.id,
    );
    if (delivery.status === "SENT") {
      skipped++;
      continue;
    }
    if (delivery.status === "RECONCILIATION_REQUIRED") {
      failed++;
      reconciliationRequired++;
      continue;
    }
    // SENDING means the process may have died after provider acceptance. The
    // stable key is safe only inside the provider's retention window.
    const sendingAgeMs = delivery.lastAttemptAt
      ? now.getTime() - delivery.lastAttemptAt.getTime()
      : 0;
    if (delivery.status === "SENDING" && sendingAgeMs >= PROVIDER_IDEMPOTENCY_TTL_MS) {
      await prisma.oneArticleDelivery.update({
        where: { id: delivery.id },
        data: {
          status: "RECONCILIATION_REQUIRED",
          reconciliationRequiredAt: now,
          failedReason: "provider_outcome_ambiguous_outside_idempotency_window",
        },
      });
      await reportProviderEvent("resend_delivery_reconciliation_required", {
        productKey: "one-article", outcome: "reconciliation_required",
        state: "idempotency_window_expired", correlationId: delivery.id,
        errorCode: "provider_outcome_ambiguous_outside_idempotency_window",
      });
      failed++;
      reconciliationRequired++;
      continue;
    }
    // A current SENDING row belongs to another live worker. Only reclaim it
    // after the same 15-minute stale boundary used by the edition claim; until
    // then even an idempotent duplicate provider request is unnecessary.
    if (delivery.status === "SENDING" && sendingAgeMs < DELIVERY_CLAIM_STALE_MS) {
      skipped++;
      continue;
    }
    if (delivery.attemptCount >= MAX_AUTOMATIC_DELIVERY_ATTEMPTS) {
      failed++;
      continue;
    }

    // Claim the recipient with compare-and-set. The edition claim serializes
    // normal cron overlap; this second boundary also protects direct recovery
    // calls and stale-worker overlap from issuing two provider requests.
    const claimed = await prisma.oneArticleDelivery.updateMany({
      where: {
        id: delivery.id,
        status: delivery.status,
        attemptCount: delivery.attemptCount,
      },
      data: {
        status: "SENDING",
        attemptCount: { increment: 1 },
        lastAttemptAt: now,
        failedReason: null,
      },
    });
    if (claimed.count !== 1) {
      skipped++;
      continue;
    }
    attempted++;
    let providerAccepted = false;
    try {
      const base = (process.env.PUBLIC_BASE_URL || "https://oneread.email").replace(/\/$/, "");
      const rendered = renderEditorialEmail(issue, {
        unsubscribe: `${base}/unsubscribe?subscription=${encodeURIComponent(recipient.unsubscribeToken)}`,
      });
      const oneClickUnsubscribe = `${base}/api/unsubscribe?subscription=${encodeURIComponent(recipient.unsubscribeToken)}`;
      const response = await send({
        to: recipient.contact.email,
        subject: rendered.subject,
        text: rendered.text,
        html: rendered.html,
        idempotencyKey: editorialDeliveryIdempotencyKey(
          issue.id,
          recipient.contact.id,
        ),
        unsubscribeUrl: oneClickUnsubscribe,
        operation: "send_editorial",
        productKey: "one-article",
      });
      providerAccepted = true;
      await options.afterProviderAccepted?.();
      // Persist acceptance separately. If the following bookkeeping fails, a
      // later run has a durable timestamp for safe reconciliation.
      await prisma.oneArticleDelivery.update({
        where: { id: delivery.id },
        data: {
          providerAcceptedAt: now,
          providerMessageId: response.messageId ?? null,
          providerStatus: "ACCEPTED",
          providerStatusAt: now,
        },
      });
      await prisma.$transaction([
        prisma.oneArticleDelivery.update({
          where: { id: delivery.id },
          data: {
            status: "SENT",
            sentAt: now,
          },
        }),
        prisma.productSubscription.update({
          where: { id: recipient.id },
          data: { lastSentAt: now },
        }),
      ]);
      sent++;
    } catch (error) {
      const ambiguousProviderOutcome = error instanceof ResendDeliveryError && error.kind === "ambiguous_outcome";
      await prisma.oneArticleDelivery.update({
        where: { id: delivery.id },
        data: {
          status: providerAccepted ? "SENDING" : ambiguousProviderOutcome ? "RECONCILIATION_REQUIRED" : "FAILED",
          reconciliationRequiredAt: ambiguousProviderOutcome ? now : null,
          providerAcceptedAt: providerAccepted ? now : undefined,
          failedReason: providerAccepted
            ? "provider_accepted_local_persistence_failed"
            : ambiguousProviderOutcome
              ? "provider_outcome_ambiguous"
            : errorMessage(error).slice(0, 1000),
        },
      });
      if (providerAccepted) {
        await reportProviderEvent("resend_accepted_persistence_failed", {
          productKey: "one-article", outcome: "persistence_failed",
          state: "provider_accepted_persistence_failed", correlationId: delivery.id,
          errorCode: "local_persistence_failed", error,
        });
      } else if (!(error instanceof ResendDeliveryError)) {
        await reportProviderEvent("resend_hard_send_failure", {
          productKey: "one-article", operation: "send_editorial", outcome: "rejected",
          state: "provider_rejected", correlationId: delivery.id,
          errorCode: "provider_send_failed", error,
        });
      }
      failed++;
    }
  }

  const [sentTotal, unresolvedTotal] = await Promise.all([
    prisma.oneArticleDelivery.count({ where: { issueId, status: "SENT" } }),
    prisma.oneArticleDelivery.count({
      where: {
        issueId,
        status: { in: ["QUEUED", "SENDING", "FAILED", "RECONCILIATION_REQUIRED"] },
      },
    }),
  ]);
  await prisma.oneArticleIssue.update({
    where: { id: issueId },
    data: {
      status: resolveEditorialIssueDeliveryStatus(sentTotal, unresolvedTotal),
      sentAt: unresolvedTotal === 0 ? now : null,
    },
  });
  reconciliationRequired = await prisma.oneArticleDelivery.count({
    where: { issueId, status: "RECONCILIATION_REQUIRED" },
  });
  return {
    recipients: recipients.length,
    sent,
    failed,
    skipped,
    attempted,
    reconciliationRequired,
  };
}

async function findOrCreateDelivery(
  issueId: string,
  contactId: string,
  productSubscriptionId: string,
) {
  // Prisma upsert can surface P2002 when two first inserts race. Postgres
  // ON CONFLICT via skipDuplicates makes that expected loser silent; both
  // workers then join the unique row and the compare-and-set chooses one.
  await prisma.oneArticleDelivery.createMany({
    data: [{ issueId, contactId, productSubscriptionId, status: "QUEUED" }],
    skipDuplicates: true,
  });
  return prisma.oneArticleDelivery.findUniqueOrThrow({
    where: { issueId_contactId: { issueId, contactId } },
  });
}

export function isWeekdayInTimezone(now: Date, timezone: string): boolean {
  try {
    const weekday = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "short",
    }).format(now);
    return weekday !== "Sat" && weekday !== "Sun";
  } catch {
    // Invalid persisted timezone data must fail closed, never trigger a send.
    return false;
  }
}

/**
 * Recipient estimate for admin screens. Deliberately delegates to the same
 * resolver dispatch uses so the preview can never disagree with the send.
 */
export async function countEligibleRecipients(readingLanguage: string): Promise<number> {
  return (await eligibleRecipients(readingLanguage)).length;
}

async function eligibleRecipients(readingLanguage: string) {
  const holders = await prisma.productSubscription.findMany({
    where: {
      productKey: "one-article",
      emailDeliveryStatus: "SUBSCRIBED",
      preferences: { is: { summaryLanguage: readingLanguage } },
    },
    include: {
      contact: { select: { id: true, email: true } },
      preferences: true,
    },
  });
  const eligibility = await resolveOneArticleEligibilityForContacts(
    holders.map((holder) => holder.contactId),
  );
  return holders.filter((holder) => eligibility.get(holder.contactId)?.allowed);
}

function normalizedIssueData(
  input: EditorialIssueInput,
  actor: string,
): Prisma.OneArticleIssueUncheckedCreateInput {
  return {
    readingLanguage: input.readingLanguage,
    subject: input.subject.trim(),
    previewText: nullable(input.previewText),
    headline: input.headline.trim(),
    bodyText: input.bodyText.trim(),
    bodyHtml: null,
    nativeContent: Array.isArray(input.nativeContent)
      ? (input.nativeContent as Prisma.InputJsonValue)
      : Prisma.JsonNull,
    mobileEnabled: input.mobileEnabled ?? true,
    mobileExploreEnabled: input.mobileExploreEnabled ?? true,
    mobileListenEnabled: input.mobileListenEnabled ?? true,
    mobileTopics: input.mobileTopics ?? [],
    mobilePriority: input.mobilePriority ?? 0,
    mobileDeck: nullable(input.mobileDeck),
    mobileAudioUrl: nullable(input.mobileAudioUrl),
    mobileAudioDurationSeconds: input.mobileAudioDurationSeconds ?? null,
    heroImageUrl: nullable(input.heroImageUrl),
    heroImageAlt: nullable(input.heroImageAlt),
    heroImageCredit: nullable(input.heroImageCredit),
    sourceTitle: nullable(input.sourceTitle),
    sourceName: nullable(input.sourceName),
    sourceUrl: nullable(input.sourceUrl),
    ctaLabel: nullable(input.ctaLabel),
    adminNotes: nullable(input.adminNotes),
    createdBy: actor,
    updatedBy: actor,
  };
}

function nullable(value: string | null | undefined): string | null {
  const clean = value?.trim();
  return clean ? clean : null;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "unknown_error";
}
