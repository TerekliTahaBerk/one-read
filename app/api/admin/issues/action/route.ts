import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireAdmin, adminActorLabel, adminFeatureFlags } from "@/lib/admin/auth";
import { recordAudit } from "@/lib/admin/audit";
import { startRun, finishRun, notifyRunFailure } from "@/lib/admin/operational-runs";
import { getControls } from "@/lib/admin/settings-store";
import {
  approveIssue,
  approveAllReady,
  scheduleIssue,
  cancelIssue,
  markNeedsReview,
  editIssueMeta,
  editIssueContent,
  regenerateIssue,
  sendTestToAdmin,
  sendIssueNow,
  type IssueActionResult,
} from "@/lib/admin/issues";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // sending may take time (reuses the pipeline)

/**
 * POST /api/admin/issues/action — issue approval / scheduling / sending.
 * Body: { action, pickId, ...args }. Auth is the admin session cookie or
 * ADMIN_TOKEN for internal callers; every successful mutation is audited.
 * "send-now" must be confirmed in the UI.
 */
export async function POST(req: Request): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const denied = requireAdmin(req, body);
  if (denied) return denied;

  const action = typeof body.action === "string" ? body.action : "";
  if (!adminFeatureFlags().mutationsEnabled) {
    return NextResponse.json(
      { ok: false, error: "admin_mutations_disabled" },
      { status: 403 },
    );
  }
  if (
    !adminFeatureFlags().sendActionsEnabled &&
    ["send-test", "send-now"].includes(action)
  ) {
    return NextResponse.json(
      { ok: false, error: "admin_send_actions_disabled" },
      { status: 403 },
    );
  }
  const pickId = typeof body.pickId === "string" ? body.pickId : "";
  const actor = adminActorLabel(req, body);
  const str = (k: string) => (typeof body[k] === "string" ? (body[k] as string) : undefined);

  // Bulk approve operates over many picks, so it never carries a pickId.
  if (action === "approve-all") {
    const bulk = await approveAllReady(actor, str("date"));
    await recordAudit({
      actor,
      action: "issue.approve-all",
      targetType: "TopicDailyPick",
      targetId: str("date") ?? new Date().toISOString().slice(0, 10),
      metadata: bulk as never,
    });
    return NextResponse.json({ ok: true, result: bulk });
  }

  let result: IssueActionResult;
  let auditMeta: Record<string, unknown> = {};

  switch (action) {
    case "approve":
      result = await approveIssue(pickId, actor);
      break;
    case "schedule":
      result = await scheduleIssue(pickId, actor, str("date"));
      auditMeta = { date: str("date") };
      break;
    case "unschedule":
    case "cancel":
      result = await cancelIssue(pickId);
      break;
    case "needs-review":
      result = await markNeedsReview(pickId);
      break;
    case "edit-meta":
      result = await editIssueMeta(pickId, {
        summaryId: str("summaryId"),
        subjectOverride: body.subjectOverride === undefined ? undefined : str("subjectOverride") ?? null,
        previewTextOverride: body.previewTextOverride === undefined ? undefined : str("previewTextOverride") ?? null,
        adminNotes: body.adminNotes === undefined ? undefined : str("adminNotes") ?? null,
      });
      break;
    case "edit-content":
      result = await editIssueContent(pickId, {
        summaryId: str("summaryId"),
        subjectOverride: body.subjectOverride === undefined ? undefined : str("subjectOverride") ?? null,
        previewTextOverride: body.previewTextOverride === undefined ? undefined : str("previewTextOverride") ?? null,
        bodyTextOverride: body.bodyTextOverride === undefined ? undefined : str("bodyTextOverride") ?? null,
        bodyHtmlOverride: body.bodyHtmlOverride === undefined ? undefined : str("bodyHtmlOverride") ?? null,
        structuredJsonOverride:
          body.structuredJsonOverride === undefined
            ? undefined
            : isJsonObject(body.structuredJsonOverride)
              ? (JSON.parse(JSON.stringify(body.structuredJsonOverride)) as Prisma.InputJsonObject)
              : null,
        adminNotes: body.adminNotes === undefined ? undefined : str("adminNotes") ?? null,
      });
      auditMeta = { summaryId: str("summaryId"), edited: true };
      break;
    case "regenerate":
      result = await regenerateIssue(pickId, actor);
      break;
    case "send-test":
      result = await sendTestToAdmin(pickId, body.email, str("summaryLanguage"));
      auditMeta = { email: body.email, summaryLanguage: str("summaryLanguage") };
      break;
    case "send-now":
      const dryRun = body.dryRun === true;
      const run = await startRun({ productKey: "one-article", route: "/api/admin/issues/action:send-now", dryRun, requireApproval: (await getControls()).oneArticle.requireApproval, metadata: { pickId } });
      try {
        result = await sendIssueNow(pickId, actor, { dryRun, confirmation: str("confirmation") });
        const counts = (result.result ?? {}) as Record<string, unknown>;
        await finishRun({ id: run.id, status: result.ok ? "SUCCESS" : "FAILED", sentCount: Number(counts.sent ?? 0), skippedCount: Number(counts.skipped ?? 0), failedCount: Number(counts.failed ?? 0), error: result.error ?? null, metadata: counts as never });
      } catch (error) {
        const message = error instanceof Error ? error.message : "OneArticle manual send failed";
        await finishRun({ id: run.id, status: "FAILED", error: message });
        await notifyRunFailure({ productName: "OneArticle", route: "/api/admin/issues/action:send-now", error: message });
        throw error;
      }
      auditMeta = { dryRun: body.dryRun === true, confirmed: str("confirmation") === "SEND ONEARTICLE NOW", result: result.result };
      break;
    default:
      return NextResponse.json({ ok: false, error: "unknown_action" }, { status: 400 });
  }

  await recordAudit({
    actor,
    action: `issue.${action}`,
    targetType: "TopicDailyPick",
    targetId: pickId,
    metadata: {
      ...auditMeta,
      ok: result.ok,
      error: result.error,
      result: result.result,
    } as never,
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
