import { NextResponse } from "next/server";
import { parseEmail } from "@/lib/options";
import { resumeEmailDelivery } from "@/lib/subscriptions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/subscribe/resume-emails
 * Body: { email: string }
 *
 * Re-enables paused email delivery (case I). Independent of billing — a paid
 * subscriber who unsubscribed from emails can turn them back on here.
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
    const resumed = await resumeEmailDelivery(email);
    return NextResponse.json({ ok: true, resumed });
  } catch (err) {
    console.error("[/api/subscribe/resume-emails] db error:", err);
    return NextResponse.json(
      { ok: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
