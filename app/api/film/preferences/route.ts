import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(): Promise<Response> {
  return NextResponse.json(
    { ok: false, error: "product_inactive", waitlistUrl: "/waitlist?product=onefilm" },
    { status: 410 },
  );
}
