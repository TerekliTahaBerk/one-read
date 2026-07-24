import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { ok: false, error: "legacy_subscription_endpoint_disabled", next: "/preferences" },
    { status: 410 },
  );
}
