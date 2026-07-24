import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** OneFilm is inactive; historical catalog data remains read-only. */
export async function POST(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  return NextResponse.json(
    { ok: false, error: "product_inactive", product: "one-film" },
    { status: 410 },
  );
}
