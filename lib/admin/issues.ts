import { prisma } from "@/lib/prisma";
import { runDailyPipeline, type SendArgs } from "@/lib/pipeline";
import { sendDailyEmail } from "@/lib/resend";
import { parseEmail } from "@/lib/options";
import { sendInstantUtc, isoDate, todayUtc } from "@/lib/admin/format";
import { renderPreviewForSummary } from "@/lib/admin/issues-read";
import {
  getOneArticleIssueReadiness,
  prepareOneArticleIssues,
  resendConfigured,
} from "@/lib/admin/one-article-ops";
import { getControls } from "@/lib/admin/settings-store";
import { SENDABLE_APPROVAL_STATUSES } from "@/lib/admin/issues-config";
import { Prisma } from "@prisma/client";

/**
 * Mutating admin actions on an "issue" (a TopicDailyPick + its summaries).
 * Approval/scheduling is a thin layer over the editorial pipeline; sending
 * reuses the exact pipeline send path so DailySend idempotency is preserved
 * and the cron can never double-send.
 */
export interface IssueActionResult {
  ok: boolean;
  error?: string;
  result?: { sent: number; skipped: number; failed: number; messageId?: string | null };
}

async function loadPick(pickId: string) {
  return prisma.topicDailyPick.findUnique({ where: { id: pickId } });
}

/** Approve an issue. Does not send — just marks it clear for sending. */
export async function approveIssue(pickId: string, actor: string): Promise<IssueActionResult> {
  const pick = await loadPick(pickId);
  if (!pick) return { ok: false, error: "not_found" };
  await prisma.topicDailyPick.update({
    where: { id: pickId },
    data: { approvalStatus: "APPROVED", approvedAt: new Date(), approvedBy: actor },
  });
  return { ok: true };
}

/**
 * Schedule an issue for 07:00 Europe/Istanbul on its date (or an explicit
 * date). The existing daily cron (04:00 UTC = 07:00 Istanbul) sends scheduled
 * approved issues — we do not add a second scheduler.
 */
export async function scheduleIssue(
  pickId: string,
  actor: string,
  dateIso?: string,
): Promise<IssueActionResult> {
  const pick = await loadPick(pickId);
  if (!pick) return { ok: false, error: "not_found" };
  const targetIso = dateIso ?? isoDate(pick.date);
  await prisma.topicDailyPick.update({
    where: { id: pickId },
    data: {
      approvalStatus: "SCHEDULED",
      scheduledFor: sendInstantUtc(targetIso),
      approvedAt: pick.approvedAt ?? new Date(),
      approvedBy: pick.approvedBy ?? actor,
    },
  });
  return { ok: true };
}

/** Cancel a scheduled/approved issue. It will not be sent by the pipeline. */
export async function cancelIssue(pickId: string): Promise<IssueActionResult> {
  const pick = await loadPick(pickId);
  if (!pick) return { ok: false, error: "not_found" };
  await prisma.topicDailyPick.update({
    where: { id: pickId },
    data: { approvalStatus: "CANCELED", scheduledFor: null },
  });
  return { ok: true };
}

/**
 * One-click bulk approval: approve every pick for a date (default today) that
 * still needs review AND already has sendable, ready content. Picks without a
 * READY summary are left in review (counted as `skipped`) so weak/empty output
 * never gets waved through. Keeps the human gate but clears the queue in one go.
 */
export async function approveAllReady(
  actor: string,
  dateIso?: string,
): Promise<{ ok: true; approved: number; skipped: number }> {
  const day = dateIso ? new Date(`${dateIso}T00:00:00Z`) : todayUtc();
  const picks = await prisma.topicDailyPick.findMany({
    where: { date: day, approvalStatus: "PENDING" },
    include: { summaries: { select: { status: true } } },
  });
  let approved = 0;
  let skipped = 0;
  for (const pick of picks) {
    if (pick.summaries.some((s) => s.status === "READY")) {
      await prisma.topicDailyPick.update({
        where: { id: pick.id },
        data: { approvalStatus: "APPROVED", approvedAt: new Date(), approvedBy: actor },
      });
      approved++;
    } else {
      skipped++;
    }
  }
  return { ok: true, approved, skipped };
}

/** Return an issue to PENDING (needs review). */
export async function markNeedsReview(pickId: string): Promise<IssueActionResult> {
  const pick = await loadPick(pickId);
  if (!pick) return { ok: false, error: "not_found" };
  await prisma.topicDailyPick.update({
    where: { id: pickId },
    data: { approvalStatus: "PENDING", scheduledFor: null },
  });
  return { ok: true };
}

/** Edit issue framing: per-language subject/preview overrides and pick notes. */
export async function editIssueMeta(
  pickId: string,
  input: {
    summaryId?: string;
    subjectOverride?: string | null;
    previewTextOverride?: string | null;
    adminNotes?: string | null;
  },
): Promise<IssueActionResult> {
  const pick = await loadPick(pickId);
  if (!pick) return { ok: false, error: "not_found" };

  if (input.adminNotes !== undefined) {
    await prisma.topicDailyPick.update({
      where: { id: pickId },
      data: { adminNotes: input.adminNotes?.trim() ? input.adminNotes.trim() : null },
    });
  }

  if (input.summaryId && (input.subjectOverride !== undefined || input.previewTextOverride !== undefined)) {
    const summary = await prisma.summary.findUnique({ where: { id: input.summaryId } });
    if (!summary || summary.topicDailyPickId !== pickId) {
      return { ok: false, error: "summary_not_found" };
    }
    await prisma.summary.update({
      where: { id: input.summaryId },
      data: {
        ...(input.subjectOverride !== undefined
          ? { subjectOverride: input.subjectOverride?.trim() || null }
          : {}),
        ...(input.previewTextOverride !== undefined
          ? { previewTextOverride: input.previewTextOverride?.trim() || null }
          : {}),
        adminEditedAt: new Date(),
      },
    });
  }
  return { ok: true };
}

/** Edit final email content without destroying the generated source fields. */
export async function editIssueContent(
  pickId: string,
  input: {
    summaryId?: string;
    subjectOverride?: string | null;
    previewTextOverride?: string | null;
    bodyTextOverride?: string | null;
    bodyHtmlOverride?: string | null;
    structuredJsonOverride?: Prisma.InputJsonObject | null;
    adminNotes?: string | null;
  },
): Promise<IssueActionResult> {
  const meta = await editIssueMeta(pickId, {
    summaryId: input.summaryId,
    subjectOverride: input.subjectOverride,
    previewTextOverride: input.previewTextOverride,
    adminNotes: input.adminNotes,
  });
  if (!meta.ok) return meta;
  if (!input.summaryId) return { ok: true };

  const summary = await prisma.summary.findUnique({ where: { id: input.summaryId } });
  if (!summary || summary.topicDailyPickId !== pickId) return { ok: false, error: "summary_not_found" };

  await prisma.summary.update({
    where: { id: input.summaryId },
    data: {
      ...(input.bodyTextOverride !== undefined
        ? { bodyTextOverride: input.bodyTextOverride?.trim() || null }
        : {}),
      ...(input.bodyHtmlOverride !== undefined
        ? { bodyHtmlOverride: input.bodyHtmlOverride?.trim() || null }
        : {}),
      ...(input.structuredJsonOverride !== undefined
        ? { structuredJsonOverride: input.structuredJsonOverride ?? Prisma.DbNull }
        : {}),
      adminEditedAt: new Date(),
    },
  });
  return { ok: true };
}

/**
 * Clear this issue's cached summaries so they are regenerated on the next
 * pipeline/dry-run. We deliberately do NOT call the LLM synchronously from an
 * admin request (no surprise cost / latency); regeneration happens on the next
 * run. Safe and reversible.
 */
export async function regenerateIssue(pickId: string, actor: string): Promise<IssueActionResult> {
  const pick = await loadPick(pickId);
  if (!pick) return { ok: false, error: "not_found" };
  const result = await prepareOneArticleIssues({
    date: pick.date,
    regeneratePickId: pickId,
    actor,
    skipIngest: true,
  });
  return {
    ok: true,
    result: { sent: 0, skipped: result.summariesRejected, failed: 0 },
  };
}

/**
 * Render this issue and send it to a single admin address. Never writes a
 * DailySend — purely a test, safe to run against the live system.
 */
export async function sendTestToAdmin(
  pickId: string,
  rawEmail: unknown,
  summaryLanguage?: string,
): Promise<IssueActionResult> {
  const email = parseEmail(rawEmail);
  if (!email) return { ok: false, error: "invalid_email" };

  const pick = await prisma.topicDailyPick.findUnique({
    where: { id: pickId },
    include: { article: true, summaries: true },
  });
  if (!pick) return { ok: false, error: "not_found" };
  if (pick.summaries.length === 0) return { ok: false, error: "no_summary" };

  const summary =
    pick.summaries.find((s) => s.summaryLanguage === summaryLanguage) ?? pick.summaries[0];
  const rendered = renderPreviewForSummary(pick, summary);
  try {
    const sent = await sendDailyEmail({
      to: email,
      subject: `[TEST] ${rendered.subject}`,
      text: rendered.text,
      html: rendered.html,
    });
    if (!sent.messageId && !resendConfigured()) return { ok: false, error: "resend_not_configured" };
    return { ok: true, result: { sent: 0, skipped: 0, failed: 0, messageId: sent.messageId ?? null } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "send_failed" };
  }
}

/**
 * Send this issue now. Requires prior approval/scheduling and strong UI/API
 * confirmation. Reuses the canonical pipeline send path so eligibility and
 * DailySend idempotency stay unchanged.
 */
export async function sendIssueNow(
  pickId: string,
  _actor: string,
  opts: { dryRun?: boolean; confirmation?: string } = {},
): Promise<IssueActionResult> {
  const pick = await loadPick(pickId);
  if (!pick) return { ok: false, error: "not_found" };
  if (opts.confirmation !== "SEND ONEARTICLE NOW") return { ok: false, error: "confirmation_required" };
  if (!(SENDABLE_APPROVAL_STATUSES as readonly string[]).includes(pick.approvalStatus)) {
    return { ok: false, error: "issue_not_approved" };
  }
  const readiness = await getOneArticleIssueReadiness({ pickId });
  if (readiness.blockers.length > 0) {
    return { ok: false, error: readiness.blockers.join("; ") };
  }
  if ((await getControls()).oneArticle.dryRun && !opts.dryRun) return { ok: false, error: "dry_run_mode_enabled" };

  const result = await runDailyPipeline({
    date: pick.date,
    skipIngest: true,
    requireApproval: true,
    pickId,
    send: opts.dryRun ? undefined : (args: SendArgs) => sendDailyEmail(args),
  });

  return {
    ok: true,
    result: { sent: result.sends.sent, skipped: result.sends.skipped, failed: result.sends.failed },
  };
}
