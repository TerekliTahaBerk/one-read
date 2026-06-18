import { prisma } from "@/lib/prisma";
import { runDailyPipeline, type SendArgs } from "@/lib/pipeline";
import { sendDailyEmail } from "@/lib/resend";
import { parseEmail } from "@/lib/options";
import { sendInstantUtc, isoDate } from "@/lib/admin/format";
import { renderPreviewForSummary } from "@/lib/admin/issues-read";

/**
 * Mutating admin actions on an "issue" (a TopicDailyPick + its summaries).
 * Approval/scheduling is a thin layer over the editorial pipeline; sending
 * reuses the exact pipeline send path so DailySend idempotency is preserved
 * and the cron can never double-send.
 */
export interface IssueActionResult {
  ok: boolean;
  error?: string;
  result?: { sent: number; skipped: number; failed: number };
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

/**
 * Clear this issue's cached summaries so they are regenerated on the next
 * pipeline/dry-run. We deliberately do NOT call the LLM synchronously from an
 * admin request (no surprise cost / latency); regeneration happens on the next
 * run. Safe and reversible.
 */
export async function regenerateIssue(pickId: string): Promise<IssueActionResult> {
  const pick = await loadPick(pickId);
  if (!pick) return { ok: false, error: "not_found" };
  await prisma.summary.deleteMany({ where: { topicDailyPickId: pickId } });
  return { ok: true };
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
    await sendDailyEmail({
      to: email,
      subject: `[TEST] ${rendered.subject}`,
      text: rendered.text,
      html: rendered.html,
    });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "send_failed" };
  }
  return { ok: true };
}

/**
 * Send this issue now. Approves it, then runs the existing daily pipeline for
 * its date with approval required — so only approved issues send, the canonical
 * send path is reused, and DailySend idempotency prevents duplicates (a later
 * cron run skips anyone already sent).
 */
export async function sendIssueNow(
  pickId: string,
  actor: string,
  opts: { dryRun?: boolean } = {},
): Promise<IssueActionResult> {
  const pick = await loadPick(pickId);
  if (!pick) return { ok: false, error: "not_found" };

  // Approve this issue (idempotent) so the approval-gated pipeline will send it.
  await prisma.topicDailyPick.update({
    where: { id: pickId },
    data: {
      approvalStatus: pick.approvalStatus === "SCHEDULED" ? "SCHEDULED" : "APPROVED",
      approvedAt: pick.approvedAt ?? new Date(),
      approvedBy: pick.approvedBy ?? actor,
    },
  });

  const result = await runDailyPipeline({
    date: pick.date,
    skipIngest: true,
    requireApproval: true,
    send: opts.dryRun ? undefined : (args: SendArgs) => sendDailyEmail(args),
  });

  return {
    ok: true,
    result: { sent: result.sends.sent, skipped: result.sends.skipped, failed: result.sends.failed },
  };
}
