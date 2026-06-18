import { NextResponse } from "next/server";
import { requireAdmin, adminActorLabel, adminFeatureFlags } from "@/lib/admin/auth";
import { recordAudit } from "@/lib/admin/audit";
import {
  pauseEmails,
  resumeEmails,
  suppressUser,
  unsuppressUser,
  setAdminOverride,
  removeAdminOverride,
  setAdminNote,
  updatePreferences,
  createUser,
  hardDeleteTestUser,
  type ActionResult,
} from "@/lib/admin/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/users/action — single entrypoint for mutating user actions.
 * Body: { action, subId?, ...args }. Auth is the admin session cookie or
 * ADMIN_TOKEN for internal callers; every successful mutation writes an audit row.
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
  if (!adminFeatureFlags().mutationsEnabled) {
    return NextResponse.json(
      { ok: false, error: "admin_mutations_disabled" },
      { status: 403 },
    );
  }

  const action = typeof body.action === "string" ? body.action : "";
  const subId = typeof body.subId === "string" ? body.subId : "";
  const actor = adminActorLabel(req, body);

  let result: ActionResult & { subId?: string };
  let auditMeta: Record<string, unknown> = {};

  switch (action) {
    case "pause":
      result = await pauseEmails(subId);
      break;
    case "resume":
      result = await resumeEmails(subId);
      break;
    case "suppress":
      result = await suppressUser(subId);
      break;
    case "unsuppress":
      result = await unsuppressUser(subId);
      break;
    case "set-override":
      result = await setAdminOverride(subId, typeof body.note === "string" ? body.note : undefined);
      break;
    case "remove-override":
      result = await removeAdminOverride(subId);
      break;
    case "set-note":
      result = await setAdminNote(subId, typeof body.note === "string" ? body.note : "");
      break;
    case "update-preferences":
      result = await updatePreferences(subId, {
        interests: body.interests,
        sourceLanguage: body.sourceLanguage,
        summaryLanguage: body.summaryLanguage,
        primaryInterest: body.primaryInterest,
      });
      auditMeta = { summaryLanguage: body.summaryLanguage, sourceLanguage: body.sourceLanguage };
      break;
    case "create-user":
      result = await createUser(body.email);
      auditMeta = { email: body.email };
      break;
    case "hard-delete":
      result = await hardDeleteTestUser(subId, typeof body.email === "string" ? body.email : "");
      auditMeta = { email: body.email };
      break;
    default:
      return NextResponse.json({ ok: false, error: "unknown_action" }, { status: 400 });
  }

  if (result.ok) {
    await recordAudit({
      actor,
      action: `user.${action}`,
      targetType: "ProductSubscription",
      targetId: result.subId ?? subId,
      metadata: auditMeta as never,
    });
  }

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
