import { NextResponse } from "next/server";
import { parseEmail, parseBillingInterval } from "@/lib/options";
import { getBillingProvider } from "@/lib/billing/provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/signup/subscribe
 * Body: { email: string, billingInterval: "monthly" }
 *
 * Legacy compatibility endpoint. It no longer marks anyone paid locally; it
 * delegates to the configured billing provider and returns a checkout URL.
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
    const result = await getBillingProvider().createCheckoutSession({
      email,
      plan: billingInterval,
      productKey: "one-article",
    });
    switch (result.kind) {
      case "redirect":
        return NextResponse.json({ ok: true, action: "redirect", url: result.url });
      case "already_active":
        return NextResponse.json({ ok: true, action: "already_active", url: result.manageUrl });
      case "needs_setup":
        return NextResponse.json({ ok: true, action: "needs_setup" });
      case "needs_setup_first":
        return NextResponse.json({ ok: true, action: "needs_setup_first" });
    }
  } catch (err) {
    console.error("[/api/signup/subscribe] db error:", err);
    return NextResponse.json(
      { ok: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
