import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseEmail, parseBillingInterval } from "@/lib/options";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/signup/subscribe
 * Body: { email: string, billingInterval: "monthly" | "annual" }
 *
 * Marks a subscriber as paid. This is a SIMULATED payment — no real charge is
 * made. Records the billing interval, stamps `subscribedAt`, and ensures the
 * subscriber is ACTIVE so daily emails resume.
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

  const billingInterval = parseBillingInterval(payload.billingInterval);
  if (!billingInterval) {
    return NextResponse.json(
      { ok: false, error: "Please choose a billing plan." },
      { status: 400 },
    );
  }

  try {
    await prisma.subscriber.update({
      where: { email },
      data: {
        billingInterval,
        subscribedAt: new Date(),
        status: "ACTIVE",
        unsubscribedAt: null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[/api/signup/subscribe] db error:", err);
    return NextResponse.json(
      { ok: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
