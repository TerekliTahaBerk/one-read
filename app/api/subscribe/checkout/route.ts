import { NextResponse } from "next/server";
import { parseEmail, parseBillingInterval } from "@/lib/options";
import { getBillingProvider } from "@/lib/billing/provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/subscribe/checkout
 * Body: { email: string, plan: "monthly" | "annual" }
 *
 * Resolves the right next step via the active billing provider. Returns one of:
 *   { ok, action: "redirect", url }        — go complete checkout
 *   { ok, action: "needs_trial" }          — start a trial first
 *   { ok, action: "needs_setup" }          — finish preferences first
 *   { ok, action: "already_active", url }  — manage billing instead
 */
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

  const plan = parseBillingInterval(payload.plan);
  if (!plan) {
    return NextResponse.json({ ok: false, error: "Please choose a valid plan." }, { status: 400 });
  }

  try {
    const result = await getBillingProvider().createCheckoutSession({ email, plan });
    switch (result.kind) {
      case "redirect":
        return NextResponse.json({ ok: true, action: "redirect", url: result.url });
      case "needs_trial":
        return NextResponse.json({ ok: true, action: "needs_trial" });
      case "needs_setup":
        return NextResponse.json({ ok: true, action: "needs_setup" });
      case "already_active":
        return NextResponse.json({ ok: true, action: "already_active", url: result.manageUrl });
    }
  } catch (err) {
    console.error("[/api/subscribe/checkout] error:", err);
    return NextResponse.json(
      { ok: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
