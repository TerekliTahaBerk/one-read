import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseEmail } from "@/lib/options";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/signup/cancel
 * Body: { email: string }
 *
 * Cancels a subscription from the manage screen. Reuses the same UNSUBSCRIBED
 * status as the email-footer unsubscribe page, so the daily pipeline stops
 * sending. Idempotent.
 */
export async function POST(request: Request) {
  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request." },
      { status: 400 },
    );
  }

  const email = parseEmail(payload.email);
  if (!email) {
    return NextResponse.json(
      { ok: false, error: "Please enter a valid email." },
      { status: 400 },
    );
  }

  try {
    await prisma.subscriber.update({
      where: { email },
      data: { status: "UNSUBSCRIBED", unsubscribedAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[/api/signup/cancel] db error:", err);
    return NextResponse.json(
      { ok: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
