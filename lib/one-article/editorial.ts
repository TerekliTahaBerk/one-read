import type { OneArticleIssue, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { SUMMARY_LANGUAGES } from "@/lib/options";
import { resolveOneArticleEligibilityForContact } from "@/lib/oneread/access";
import { renderEditorialEmail } from "./editorial-email";
import { sendDailyEmail } from "@/lib/resend";

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

export interface EditorialIssueInput {
  readingLanguage: string;
  subject: string;
  previewText?: string | null;
  headline: string;
  bodyText: string;
  sourceTitle?: string | null;
  sourceName?: string | null;
  sourceUrl?: string | null;
  ctaLabel?: string | null;
  adminNotes?: string | null;
}

export function validateEditorialIssue(
  input: EditorialIssueInput,
): { ok: true } | { ok: false; error: string } {
  if (!(EDITORIAL_LANGUAGES as readonly string[]).includes(input.readingLanguage)) {
    return { ok: false, error: "invalid_reading_language" };
  }
  if (!input.subject.trim()) return { ok: false, error: "subject_required" };
  if (!input.headline.trim()) return { ok: false, error: "headline_required" };
  if (!input.bodyText.trim()) return { ok: false, error: "body_required" };
  if (input.subject.trim().length > 160) return { ok: false, error: "subject_too_long" };
  if ((input.previewText ?? "").trim().length > 240) return { ok: false, error: "preview_too_long" };
  if (input.sourceUrl && !safeHttpUrl(input.sourceUrl)) {
    return { ok: false, error: "invalid_source_url" };
  }
  return { ok: true };
}

export async function createEditorialIssue(
  input: EditorialIssueInput,
  actor: string,
): Promise<OneArticleIssue> {
  const validation = validateEditorialIssue(input);
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
  const validation = validateEditorialIssue(args.input);
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
  return prisma.oneArticleIssue.update({
    where: { id },
    data: {
      status: "SCHEDULED",
      scheduledFor: new Date(),
      scheduledAt: new Date(),
      claimedAt: null,
      updatedBy: actor,
      version: { increment: 1 },
    },
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
    where: { status: "SCHEDULED", scheduledFor: { lte: now } },
    orderBy: { scheduledFor: "asc" },
    take: 10,
  });
  const total: DispatchEditorialResult = {
    issues: 0,
    recipients: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
  };
  for (const issue of due) {
    const claimed = await prisma.oneArticleIssue.updateMany({
      where: { id: issue.id, status: "SCHEDULED" },
      data: { status: "SENDING", claimedAt: now },
    });
    if (claimed.count !== 1) continue;
    total.issues++;
    const result = await dispatchIssue(issue.id);
    total.recipients += result.recipients;
    total.sent += result.sent;
    total.failed += result.failed;
    total.skipped += result.skipped;
  }
  return total;
}

async function dispatchIssue(
  issueId: string,
): Promise<Omit<DispatchEditorialResult, "issues">> {
  const issue = await prisma.oneArticleIssue.findUniqueOrThrow({ where: { id: issueId } });
  const recipients = await eligibleRecipients(issue.readingLanguage);
  const eligibleContactIds = recipients.map((recipient) => recipient.contact.id);
  let sent = 0;
  let failed = 0;
  let skipped = 0;

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
    const delivery = await prisma.oneArticleDelivery.upsert({
      where: { issueId_contactId: { issueId, contactId: recipient.contact.id } },
      create: {
        issueId,
        contactId: recipient.contact.id,
        productSubscriptionId: recipient.id,
        status: "QUEUED",
      },
      update: {},
    });
    if (delivery.status === "SENT") {
      skipped++;
      continue;
    }
    if (delivery.attemptCount >= 3) {
      failed++;
      continue;
    }

    await prisma.oneArticleDelivery.update({
      where: { id: delivery.id },
      data: {
        status: "SENDING",
        attemptCount: { increment: 1 },
        lastAttemptAt: new Date(),
        failedReason: null,
      },
    });
    try {
      const base = (process.env.PUBLIC_BASE_URL || "https://oneread.app").replace(/\/$/, "");
      const rendered = renderEditorialEmail(issue, {
        unsubscribe: `${base}/unsubscribe?subscription=${encodeURIComponent(recipient.unsubscribeToken)}`,
      });
      const response = await sendDailyEmail({
        to: recipient.contact.email,
        subject: rendered.subject,
        text: rendered.text,
        html: rendered.html,
        idempotencyKey: editorialDeliveryIdempotencyKey(
          issue.id,
          recipient.contact.id,
        ),
      });
      await prisma.$transaction([
        prisma.oneArticleDelivery.update({
          where: { id: delivery.id },
          data: {
            status: "SENT",
            sentAt: new Date(),
            providerMessageId: response.messageId ?? null,
          },
        }),
        prisma.productSubscription.update({
          where: { id: recipient.id },
          data: { lastSentAt: new Date() },
        }),
      ]);
      sent++;
    } catch (error) {
      await prisma.oneArticleDelivery.update({
        where: { id: delivery.id },
        data: {
          status: "FAILED",
          failedReason: errorMessage(error).slice(0, 1000),
        },
      });
      failed++;
    }
  }

  const [sentTotal, unresolvedTotal] = await Promise.all([
    prisma.oneArticleDelivery.count({ where: { issueId, status: "SENT" } }),
    prisma.oneArticleDelivery.count({
      where: { issueId, status: { in: ["QUEUED", "SENDING", "FAILED"] } },
    }),
  ]);
  await prisma.oneArticleIssue.update({
    where: { id: issueId },
    data: {
      status: resolveEditorialIssueDeliveryStatus(sentTotal, unresolvedTotal),
      sentAt: unresolvedTotal === 0 ? new Date() : null,
    },
  });
  return { recipients: recipients.length, sent, failed, skipped };
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
  const eligible = [];
  for (const holder of holders) {
    const result = await resolveOneArticleEligibilityForContact(holder.contactId);
    if (result.allowed) eligible.push(holder);
  }
  return eligible;
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

function safeHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "unknown_error";
}
