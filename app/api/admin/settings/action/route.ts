import { NextResponse } from "next/server";
import { requireAdmin, adminActorLabel, adminFeatureFlags } from "@/lib/admin/auth";
import { isSettingKey, setSetting } from "@/lib/admin/settings-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/settings/action — set one panel-editable control.
 * Body: { action: "set", key, value: boolean }. Auth = admin session cookie or
 * ADMIN_TOKEN; gated by ADMIN_MUTATIONS_ENABLED; every write is audited by
 * `setSetting`. Only allow-listed keys (isSettingKey) can be written.
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
    return NextResponse.json({ ok: false, error: "admin_mutations_disabled" }, { status: 403 });
  }

  const action = typeof body.action === "string" ? body.action : "";
  if (action !== "set") {
    return NextResponse.json({ ok: false, error: "unknown_action" }, { status: 400 });
  }

  const key = typeof body.key === "string" ? body.key : "";
  if (!isSettingKey(key)) {
    return NextResponse.json({ ok: false, error: "unknown_key" }, { status: 400 });
  }
  if (!["boolean", "number", "string"].includes(typeof body.value)) {
    return NextResponse.json({ ok: false, error: "invalid_value_type" }, { status: 400 });
  }
  try {
    await setSetting(key, body.value as boolean | number | string, adminActorLabel(req, body));
  } catch (error) {
    if (error instanceof Error && error.message === "invalid_setting_value") {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }
    throw error;
  }
  return NextResponse.json({ ok: true, result: { key, value: body.value } });
}
