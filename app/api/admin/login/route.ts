import { NextResponse } from "next/server";
import {
  adminLoginConfigured,
  setAdminSessionCookie,
  verifyAdminCredentials,
} from "@/lib/admin/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!adminLoginConfigured()) {
    return NextResponse.json(
      { ok: false, error: "admin_login_not_configured" },
      { status: 503 },
    );
  }

  let body: { email?: string; password?: string; next?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const email = body.email ?? "";
  const password = body.password ?? "";
  const ok = await verifyAdminCredentials(email, password);
  if (!ok) {
    return NextResponse.json(
      { ok: false, error: "invalid_credentials" },
      { status: 401 },
    );
  }

  const next = sanitizeNext(body.next);
  const res = NextResponse.json({ ok: true, next });
  setAdminSessionCookie(res, process.env.ADMIN_EMAIL ?? email.trim().toLowerCase());
  return res;
}

function sanitizeNext(next?: string): string {
  if (!next?.startsWith("/admin") || next.startsWith("/admin/login")) return "/admin";
  return next;
}
