import { NextResponse } from "next/server";
export async function POST(): Promise<Response> {
  return NextResponse.json({ ok: false, error: "product_inactive", waitlistUrl: "/waitlist?product=onelingo" }, { status: 410 });
}
