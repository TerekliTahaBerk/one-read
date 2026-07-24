import { NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
async function handler(request: Request): Promise<Response> {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ ok: true, skipped: true, reason: "product_inactive" });
}
export const GET = handler;
export const POST = handler;
