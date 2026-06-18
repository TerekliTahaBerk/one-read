import { NextResponse } from "next/server";
import { requireAdmin, adminActorLabel } from "@/lib/admin/auth";
import { recordAudit } from "@/lib/admin/audit";
import {
  approveIssue,
  scheduleIssue,
  cancelIssue,
  markNeedsReview,
  editIssueMeta,
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
 * Body: { action, pickId, token, ...args }. Shared ADMIN_TOKEN auth; every
 * successful mutation is audited. "send-now" must be confirmed in the UI.
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
  const pickId = typeof body.pickId === "string" ? body.pickId : "";
  const actor = adminActorLabel(req, body);
  const str = (k: string) => (typeof body[k] === "string" ? (body[k] as string) : undefined);

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
    case "regenerate":
      result = await regenerateIssue(pickId);
      break;
    case "send-test":
      result = await sendTestToAdmin(pickId, body.email, str("summaryLanguage"));
      auditMeta = { email: body.email, summaryLanguage: str("summaryLanguage") };
      break;
    case "send-now":
      result = await sendIssueNow(pickId, actor, { dryRun: body.dryRun === true });
      auditMeta = { dryRun: body.dryRun === true, result: result.result };
      break;
    default:
      return NextResponse.json({ ok: false, error: "unknown_action" }, { status: 400 });
  }

  if (result.ok) {
    await recordAudit({
      actor,
      action: `issue.${action}`,
      targetType: "TopicDailyPick",
      targetId: pickId,
      metadata: auditMeta as never,
    });
  }

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
