import { NextResponse } from "next/server";
import { requireAdminMutation } from "@/lib/admin/auth";
export async function POST(request: Request): Promise<Response> {
  const denied = await requireAdminMutation(request);
  if (denied) return denied;
  return NextResponse.json({ ok: false, error: "legacy_pipeline_disabled", next: "/admin/one-article/new" }, { status: 410 });
}
