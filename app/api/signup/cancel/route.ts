import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseEmail } from "@/lib/options";
import { getBillingProvider } from "@/lib/billing/provider";
import { findOneArticleSubscription } from "@/lib/subscriptions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/signup/cancel
 * Body: { email: string }
 *
 * Cancels billing from the manage screen. Polar remains the source of truth:
 * confirmed subscriptions are canceled at period end through the provider.
 * If there is no confirmed provider subscription yet, returns a non-error
 * action so the UI can send the user to checkout/setup instead of throwing.
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
    const sub = await findOneArticleSubscription(email);
    if (!sub) {
      return NextResponse.json({ ok: true, action: "needs_setup_first" });
    }
    if (!sub.providerSubscriptionId || !sub.paymentProvider) {
      return NextResponse.json({ ok: true, action: "no_active_subscription" });
    }

    await getBillingProvider().cancelSubscription(email);

    await prisma.subscriber.updateMany({
      where: { email },
      data: { status: "UNSUBSCRIBED", unsubscribedAt: new Date() },
    });

    return NextResponse.json({ ok: true, action: "canceled" });
  } catch (err) {
    console.error("[/api/signup/cancel] db error:", err);
    return NextResponse.json(
      { ok: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
