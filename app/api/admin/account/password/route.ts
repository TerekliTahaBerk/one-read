import { NextResponse } from "next/server";
import {
  changeAdminPassword,
  readAdminSessionFromRequest,
  requireAdminMutation,
  setAdminSessionCookie,
} from "@/lib/admin/auth";
import { recordAudit } from "@/lib/admin/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  const session = await readAdminSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const denied = await requireAdminMutation(req);
  if (denied) return denied;

  let body: { currentPassword?: unknown; newPassword?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const currentPassword =
    typeof body.currentPassword === "string" ? body.currentPassword : "";
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { ok: false, error: "password_fields_required" },
      { status: 400 },
    );
  }

  const result = await changeAdminPassword({
    email: session.email,
    currentPassword,
    newPassword,
  });
  if (!result.ok) {
    const status = result.error === "current_password_incorrect" ? 401 : 400;
    return NextResponse.json({ ok: false, error: result.error }, { status });
  }

  await recordAudit({
    actor: session.email,
    action: "admin.password.changed",
    targetType: "AdminCredential",
    targetId: session.email,
    metadata: { sessionVersion: result.sessionVersion, otherSessionsRevoked: true },
  });

  const response = NextResponse.json({
    ok: true,
    message: "password_changed",
    otherSessionsRevoked: true,
  });
  await setAdminSessionCookie(response, session.email);
  return response;
}
