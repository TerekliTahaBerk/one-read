import { NextResponse } from "next/server";

/** The legacy standalone OneArticle signup has been replaced by /subscribe. */
export async function POST(): Promise<Response> {
  return NextResponse.json(
    { ok: false, error: "legacy_flow_disabled", next: "/subscribe" },
    { status: 410 },
  );
}
