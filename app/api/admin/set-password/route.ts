import { NextResponse } from "next/server";
import { redeemAdminInvite, setAdminSessionCookie } from "@/lib/admin/auth";
import { recordAudit } from "@/lib/admin/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/set-password — redeem an administrator invitation.
 *
 * Deliberately unauthenticated: the invitee has no account yet, and the
 * one-time token in the body is the only thing that authorises the call. The
 * token is single-use and short-lived, the password is validated against the
 * same policy as a password change, and a success signs the new administrator
 * in directly so the password never has to be re-entered anywhere.
 */
export async function POST(req: Request): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const token = typeof body.token === "string" ? body.token : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!token || !password) {
    return NextResponse.json({ ok: false, error: "invalid_request" }, { status: 400 });
  }

  const result = await redeemAdminInvite(token, password);
  if (!result.ok) {
    // A bad token and a rejected password are both 400: the response must not
    // become an oracle for which tokens exist.
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }

  await recordAudit({
    actor: result.email,
    action: "admin.invite.redeemed",
    targetType: "AdminCredential",
    targetId: result.email,
    metadata: {},
  });

  const res = NextResponse.json({ ok: true, next: "/admin" });
  await setAdminSessionCookie(res, result.email);
  return res;
}
