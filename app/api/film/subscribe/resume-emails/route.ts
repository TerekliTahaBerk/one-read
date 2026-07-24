import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ ok: false, error: "product_inactive" }, { status: 410 });
}
