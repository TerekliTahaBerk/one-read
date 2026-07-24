import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(
    { ok: false, error: "legacy_billing_endpoint_disabled", next: "/preferences" },
    { status: 410 },
  );
}
