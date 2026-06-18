import { NextResponse } from "next/server";
import { clearAdminSessionCookie } from "@/lib/admin/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const res = NextResponse.redirect(new URL("/admin/login", req.url));
  clearAdminSessionCookie(res);
  return res;
}
