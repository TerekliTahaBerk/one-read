import { NextResponse } from "next/server";
import {
  adminActorLabel,
  adminFeatureFlags,
  inviteAdmin,
  requireAdminMutation,
  revokeAdmin,
} from "@/lib/admin/auth";
import { recordAudit } from "@/lib/admin/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/admins/action — add or remove a panel administrator.
 *
 * Body: { action: "invite" | "revoke", email }. Auth is the admin session
 * cookie or ADMIN_TOKEN, and the write is gated by ADMIN_MUTATIONS_ENABLED.
 *
 * The invite response carries a one-time setup URL. That URL is a credential:
 * it is generated here, never stored in plaintext, and never emailed by this
 * route — the administrator who created it decides how it reaches the invitee.
 * The audit row records who was invited and by whom, never the token.
 */
export async function POST(req: Request): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const denied = await requireAdminMutation(req, body);
  if (denied) return denied;
  if (!adminFeatureFlags().mutationsEnabled) {
    return NextResponse.json({ ok: false, error: "admin_mutations_disabled" }, { status: 403 });
  }

  const action = typeof body.action === "string" ? body.action : "";
  const email = typeof body.email === "string" ? body.email : "";
  const actor = await adminActorLabel(req, body);

  if (action === "invite") {
    const result = await inviteAdmin(email, actor);
    if (!result.ok) {
      return NextResponse.json(result, { status: result.error === "invalid_email" ? 400 : 409 });
    }
    await recordAudit({
      actor,
      action: "admin.invite",
      targetType: "AdminCredential",
      targetId: result.email,
      metadata: { expiresAt: result.expiresAt.toISOString() },
    });
    const origin = new URL(req.url).origin;
    return NextResponse.json({
      ok: true,
      email: result.email,
      expiresAt: result.expiresAt.toISOString(),
      setupUrl: `${origin}/admin/set-password?token=${encodeURIComponent(result.token)}`,
    });
  }

  if (action === "revoke") {
    const result = await revokeAdmin(email, actor);
    if (!result.ok) {
      return NextResponse.json(result, { status: result.error === "admin_not_found" ? 404 : 409 });
    }
    await recordAudit({
      actor,
      action: "admin.revoke",
      targetType: "AdminCredential",
      targetId: email.trim().toLowerCase(),
      metadata: {},
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, error: "unknown_action" }, { status: 400 });
}
