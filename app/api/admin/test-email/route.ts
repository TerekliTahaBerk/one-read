import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Retired AI/RSS test sender. Use an edition's Test delivery action instead. */
export async function POST(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  return NextResponse.json(
    {
      ok: false,
      error: "legacy_editorial_endpoint_disabled",
      next: "/admin/one-article/issues",
    },
    { status: 410 },
  );
}
