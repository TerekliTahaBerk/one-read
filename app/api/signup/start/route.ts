import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Retired interest-based onboarding endpoint. */
export async function POST() {
  return NextResponse.json(
    { ok: false, error: "legacy_signup_disabled", next: "/subscribe" },
    { status: 410 },
  );
}
