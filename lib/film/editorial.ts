import type { OneFilmIssue, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveOneFilmEligibilityForContact } from "@/lib/oneread/access";
import { renderFilmEditorialEmail } from "./editorial-email";
import { sendDailyEmail } from "@/lib/resend";
import {
  validateFilmEditorialDraft,
  validateFilmEditorialIssue,
  type FilmEditorialContentInput,
} from "./editorial-validation";

export const FILM_EDITORIAL_STATUSES = [
  "DRAFT", "READY", "SCHEDULED", "SENDING", "SENT",
  "PARTIALLY_FAILED", "FAILED", "CANCELED",
] as const;

export type FilmEditorialIssueInput = FilmEditorialContentInput;

export async function createFilmEditorialIssue(input: FilmEditorialIssueInput, actor: string) {
  const validation = validateFilmEditorialDraft(input);
  if (!validation.ok) throw new Error(validation.error);
  return prisma.oneFilmIssue.create({ data: normalizedIssueData(input, actor) });
}

export async function updateFilmEditorialIssue(args: {
  id: string; version: number; input: FilmEditorialIssueInput; actor: string;
}) {
  const validation = validateFilmEditorialDraft(args.input);
  if (!validation.ok) throw new Error(validation.error);
  const current = await prisma.oneFilmIssue.findUnique({ where: { id: args.id } });
  if (!current) throw new Error("issue_not_found");
  if (!["DRAFT", "READY"].includes(current.status)) throw new Error("issue_not_editable");
  const data = normalizedIssueData(args.input, args.actor);
  const { createdBy: _createdBy, ...updateData } = data;
  const updated = await prisma.oneFilmIssue.updateMany({
    where: { id: args.id, version: args.version },
    data: { ...updateData, version: { increment: 1 } },
  });
  if (updated.count !== 1) throw new Error("version_conflict");
  return prisma.oneFilmIssue.findUniqueOrThrow({ where: { id: args.id } });
}

export async function setFilmEditorialIssueReady(id: string, actor: string) {
  const issue = await prisma.oneFilmIssue.findUniqueOrThrow({ where: { id } });
  const validation = validateFilmEditorialIssue(issue);
  if (!validation.ok) throw new Error(validation.error);
  if (!["DRAFT", "READY"].includes(issue.status)) throw new Error("invalid_status_transition");
  return prisma.oneFilmIssue.update({
    where: { id },
    data: { status: "READY", readyAt: new Date(), updatedBy: actor, version: { increment: 1 } },
  });
}

export async function scheduleFilmEditorialIssue(args: { id: string; scheduledFor: Date; actor: string }) {
  if (!Number.isFinite(args.scheduledFor.getTime())) throw new Error("invalid_schedule");
  if (args.scheduledFor.getTime() <= Date.now()) throw new Error("schedule_must_be_future");
  const issue = await prisma.oneFilmIssue.findUniqueOrThrow({ where: { id: args.id } });
  const validation = validateFilmEditorialIssue(issue);
  if (!validation.ok) throw new Error(validation.error);
  if (!["DRAFT", "READY", "SCHEDULED"].includes(issue.status)) throw new Error("invalid_status_transition");
  return prisma.oneFilmIssue.update({
    where: { id: args.id },
    data: {
      status: "SCHEDULED", scheduledFor: args.scheduledFor, scheduledAt: new Date(),
      readyAt: issue.readyAt ?? new Date(), updatedBy: args.actor, canceledAt: null,
      version: { increment: 1 },
    },
  });
}

export async function cancelFilmEditorialIssue(id: string, actor: string) {
  const issue = await prisma.oneFilmIssue.findUniqueOrThrow({ where: { id } });
  if (!["DRAFT", "READY", "SCHEDULED", "FAILED", "PARTIALLY_FAILED"].includes(issue.status)) {
    throw new Error("invalid_status_transition");
  }
  return prisma.oneFilmIssue.update({
    where: { id },
    data: { status: "CANCELED", canceledAt: new Date(), updatedBy: actor, version: { increment: 1 } },
  });
}

export async function retryFilmEditorialIssue(id: string, actor: string) {
  const issue = await prisma.oneFilmIssue.findUniqueOrThrow({ where: { id } });
  if (!["FAILED", "PARTIALLY_FAILED"].includes(issue.status)) throw new Error("invalid_status_transition");
  return prisma.oneFilmIssue.update({
    where: { id },
    data: { status: "SCHEDULED", scheduledFor: new Date(), scheduledAt: new Date(), claimedAt: null, updatedBy: actor, version: { increment: 1 } },
  });
}

export async function duplicateFilmEditorialIssue(id: string, actor: string) {
  const source = await prisma.oneFilmIssue.findUniqueOrThrow({ where: { id } });
  return prisma.oneFilmIssue.create({
    data: {
      emailLanguage: source.emailLanguage, subject: source.subject, previewText: source.previewText,
      filmTitle: source.filmTitle, bodyText: source.bodyText, bodyHtml: source.bodyHtml,
      heroImageUrl: source.heroImageUrl, heroImageAlt: source.heroImageAlt, heroImageCredit: source.heroImageCredit,
      filmYear: source.filmYear, director: source.director, filmLanguage: source.filmLanguage,
      runtimeMinutes: source.runtimeMinutes, sourceName: source.sourceName, sourceUrl: source.sourceUrl,
      ctaLabel: source.ctaLabel, adminNotes: source.adminNotes, createdBy: actor, updatedBy: actor,
    },
  });
}

export async function countEligibleFilmEditorialRecipients(emailLanguage: string): Promise<number> {
  return (await eligibleRecipients(emailLanguage)).length;
}

export function filmEditorialDeliveryIdempotencyKey(issueId: string, contactId: string): string {
  return `onefilm-${issueId}-${contactId}`;
}

export function resolveFilmEditorialDeliveryStatus(
  sentTotal: number, unresolvedTotal: number,
): "SENT" | "PARTIALLY_FAILED" | "FAILED" {
  if (unresolvedTotal === 0) return "SENT";
  return sentTotal > 0 ? "PARTIALLY_FAILED" : "FAILED";
}

export interface DispatchFilmEditorialResult {
  issues: number; recipients: number; sent: number; failed: number; skipped: number;
}

export async function dispatchDueFilmEditorialIssues(now = new Date()): Promise<DispatchFilmEditorialResult> {
  await prisma.oneFilmIssue.updateMany({
    where: { status: "SENDING", claimedAt: { lt: new Date(now.getTime() - 15 * 60 * 1000) } },
    data: { status: "SCHEDULED", claimedAt: null },
  });
  const due = await prisma.oneFilmIssue.findMany({
    where: { status: "SCHEDULED", scheduledFor: { lte: now } },
    orderBy: { scheduledFor: "asc" }, take: 10,
  });
  const total = { issues: 0, recipients: 0, sent: 0, failed: 0, skipped: 0 };
  for (const issue of due) {
    const claimed = await prisma.oneFilmIssue.updateMany({
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

async function dispatchIssue(issueId: string) {
  const issue = await prisma.oneFilmIssue.findUniqueOrThrow({ where: { id: issueId } });
  const recipients = await eligibleRecipients(issue.emailLanguage);
  const eligibleContactIds = recipients.map((recipient) => recipient.contact.id);
  let sent = 0, failed = 0, skipped = 0;
  const noLongerEligible = await prisma.oneFilmDelivery.updateMany({
    where: {
      issueId, status: { in: ["QUEUED", "SENDING", "FAILED"] },
      ...(eligibleContactIds.length > 0 ? { contactId: { notIn: eligibleContactIds } } : {}),
    },
    data: { status: "SKIPPED", skippedReason: "no_longer_eligible", failedReason: null },
  });
  skipped += noLongerEligible.count;

  for (const recipient of recipients) {
    const delivery = await prisma.oneFilmDelivery.upsert({
      where: { issueId_contactId: { issueId, contactId: recipient.contact.id } },
      create: { issueId, contactId: recipient.contact.id, productSubscriptionId: recipient.id, status: "QUEUED" },
      update: {},
    });
    if (delivery.status === "SENT") { skipped++; continue; }
    if (delivery.attemptCount >= 3) { failed++; continue; }
    await prisma.oneFilmDelivery.update({
      where: { id: delivery.id },
      data: { status: "SENDING", attemptCount: { increment: 1 }, lastAttemptAt: new Date(), failedReason: null },
    });
    try {
      const base = (process.env.PUBLIC_BASE_URL || "https://oneread.email").replace(/\/$/, "");
      const rendered = renderFilmEditorialEmail(issue, {
        unsubscribe: `${base}/unsubscribe?subscription=${encodeURIComponent(recipient.unsubscribeToken)}`,
      });
      const response = await sendDailyEmail({
        to: recipient.contact.email, subject: rendered.subject, text: rendered.text, html: rendered.html,
        idempotencyKey: filmEditorialDeliveryIdempotencyKey(issue.id, recipient.contact.id),
      });
      await prisma.$transaction([
        prisma.oneFilmDelivery.update({ where: { id: delivery.id }, data: { status: "SENT", sentAt: new Date(), providerMessageId: response.messageId ?? null } }),
        prisma.productSubscription.update({ where: { id: recipient.id }, data: { lastSentAt: new Date() } }),
      ]);
      sent++;
    } catch (error) {
      await prisma.oneFilmDelivery.update({
        where: { id: delivery.id },
        data: { status: "FAILED", failedReason: errorMessage(error).slice(0, 1000) },
      });
      failed++;
    }
  }
  const [sentTotal, unresolvedTotal] = await Promise.all([
    prisma.oneFilmDelivery.count({ where: { issueId, status: "SENT" } }),
    prisma.oneFilmDelivery.count({ where: { issueId, status: { in: ["QUEUED", "SENDING", "FAILED"] } } }),
  ]);
  await prisma.oneFilmIssue.update({
    where: { id: issueId },
    data: { status: resolveFilmEditorialDeliveryStatus(sentTotal, unresolvedTotal), sentAt: unresolvedTotal === 0 ? new Date() : null },
  });
  return { recipients: recipients.length, sent, failed, skipped };
}

async function eligibleRecipients(emailLanguage: string) {
  const holders = await prisma.productSubscription.findMany({
    where: {
      productKey: "one-film", emailDeliveryStatus: "SUBSCRIBED",
      filmPreferences: { is: { emailLanguage } },
    },
    include: { contact: { select: { id: true, email: true } }, filmPreferences: true },
  });
  const eligible = [];
  for (const holder of holders) {
    const result = await resolveOneFilmEligibilityForContact(holder.contactId);
    if (result.allowed) eligible.push(holder);
  }
  return eligible;
}

function normalizedIssueData(
  input: FilmEditorialIssueInput, actor: string,
): Prisma.OneFilmIssueUncheckedCreateInput {
  return {
    emailLanguage: input.emailLanguage, subject: input.subject.trim(), previewText: nullable(input.previewText),
    filmTitle: input.filmTitle.trim(), bodyText: input.bodyText.trim(), bodyHtml: null,
    heroImageUrl: nullable(input.heroImageUrl), heroImageAlt: nullable(input.heroImageAlt),
    heroImageCredit: nullable(input.heroImageCredit), filmYear: input.filmYear ?? null,
    director: nullable(input.director), filmLanguage: nullable(input.filmLanguage),
    runtimeMinutes: input.runtimeMinutes ?? null, sourceName: nullable(input.sourceName),
    sourceUrl: nullable(input.sourceUrl), ctaLabel: nullable(input.ctaLabel),
    adminNotes: nullable(input.adminNotes), createdBy: actor, updatedBy: actor,
  };
}
function nullable(value: string | null | undefined): string | null { const clean = value?.trim(); return clean || null; }
function errorMessage(error: unknown): string { return error instanceof Error ? error.message : "unknown_error"; }
