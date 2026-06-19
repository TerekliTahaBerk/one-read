import { NextResponse } from "next/server";
import { clearAdminSessionCookie } from "@/lib/admin/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Logout is intentionally POST-only. A GET handler here would be triggered by
 * Next.js <Link> prefetch, browser link scanners, or any stray GET — silently
 * clearing the admin session right after login. Destructive actions must never
 * be reachable by GET. The 303 status converts the POST into a GET navigation
 * to the login page.
 */
export async function POST(req: Request) {
  const res = NextResponse.redirect(new URL("/admin/login", req.url), 303);
  clearAdminSessionCookie(res);
  return res;
}
