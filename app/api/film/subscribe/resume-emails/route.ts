import { NextResponse } from "next/server";
import { parseEmail } from "@/lib/options";
import { resumeFilmEmailDelivery } from "@/lib/film/subscriptions";

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

  const resumed = await resumeFilmEmailDelivery(email);
  return NextResponse.json({ ok: resumed });
}
