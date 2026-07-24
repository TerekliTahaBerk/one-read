import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
export async function POST(request: Request): Promise<Response> {
  const denied = requireAdmin(request);
  if (denied) return denied;
  return NextResponse.json({ ok: false, error: "legacy_pipeline_disabled" }, { status: 410 });
}
