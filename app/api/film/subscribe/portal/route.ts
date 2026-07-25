import { NextResponse } from "next/server";
import { parseEmail } from "@/lib/options";
import { createOneFilmPortalSession } from "@/lib/film/checkout";

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
  if (!email) return NextResponse.json({ ok: false, error: "Please enter a valid email." }, { status: 400 });
  try {
    const { url } = await createOneFilmPortalSession(email);
    return NextResponse.json({ ok: true, url });
  } catch (error) {
    console.error("[/api/film/subscribe/portal] error:", error);
    return NextResponse.json({ ok: false, error: "Billing portal isn’t available yet." }, { status: 400 });
  }
}
