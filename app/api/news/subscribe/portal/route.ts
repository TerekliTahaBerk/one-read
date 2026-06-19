import { NextResponse } from "next/server";
import { parseEmail } from "@/lib/options";
import { createOneNewsPortalSession } from "@/lib/news/checkout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const email = parseEmail(payload.email);
  if (!email) {
    return NextResponse.json({ ok: false, error: "Please enter a valid email." }, { status: 400 });
  }

  try {
    const { url } = await createOneNewsPortalSession(email);
    return NextResponse.json({ ok: true, url });
  } catch (err) {
    console.error("[/api/news/subscribe/portal] error:", err);
    return NextResponse.json(
      { ok: false, error: "Billing portal isn’t available yet." },
      { status: 400 },
    );
  }
}
