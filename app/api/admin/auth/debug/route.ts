import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, getAdminSession } from "@/lib/admin/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Safe admin-auth diagnostics. Returns only presence/validity booleans — never
 * cookie values, tokens, or secrets. Useful for confirming the session cookie
 * survives navigation between admin routes.
 */
export async function GET() {
  const cookiePresent = Boolean(cookies().get(ADMIN_SESSION_COOKIE)?.value);
  const session = getAdminSession();

  if (!session) {
    return NextResponse.json(
      {
        authenticated: false,
        cookiePresent,
        sessionValid: false,
        path: "/api/admin/auth/debug",
      },
      { status: 200 },
    );
  }

  return NextResponse.json({
    authenticated: true,
    cookiePresent: true,
    sessionValid: true,
    expiresAt: session.expiresAt.toISOString(),
    path: "/api/admin/auth/debug",
  });
}
