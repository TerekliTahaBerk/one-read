import { NextResponse } from "next/server";
import { parseEmail } from "@/lib/options";
import { resolveSubscribeState } from "@/lib/subscriptions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/subscribe/lookup
 * Body: { email: string }
 *
 * Resolves where an email sits in the One Article lifecycle so the subscribe
 * page can show the right next action. Read-only: never mutates and never
 * returns provider/billing identifiers.
 */
export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request." },
      { status: 400 },
    );
  }

  const email = parseEmail((payload as { email?: unknown })?.email);
  if (!email) {
    return NextResponse.json(
      { ok: false, error: "Please enter a valid email." },
      { status: 400 },
    );
  }

  try {
    const result = await resolveSubscribeState(email);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[/api/subscribe/lookup] db error:", err);
    return NextResponse.json(
      { ok: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
