import { NextResponse } from "next/server";
import { parseEmail } from "@/lib/options";
import { hasVerifiedEmail } from "@/lib/oneread/verification";
import { parseOfferSelection } from "@/lib/products/registry";
import { startOfferCheckout } from "@/lib/billing/offer-checkout";
import { validatePublicLaunchConfiguration } from "@/lib/launch-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/billing/checkout
 * Body: { email: string, offer: "one-article"|"one-news"|"one-read",
 *         interval: "monthly"|"annual" }
 *
 * The request names an offer, never a payment-provider product. `offer` and
 * `interval` are validated against the product registry and rejected with 400
 * if they are not exact registry values, so a caller cannot smuggle a Polar
 * product id through this endpoint and have the server bill against it.
 */
export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production" && process.env.PUBLIC_CHECKOUT_ENABLED !== "true") {
    return NextResponse.json({ ok: false, error: "New checkout is not available yet." }, { status: 503 });
  }
  if (process.env.NODE_ENV === "production" && !validatePublicLaunchConfiguration().ready) {
    return NextResponse.json({ ok: false, error: "Checkout configuration is incomplete." }, { status: 503 });
  }
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
  if (!hasVerifiedEmail(email)) {
    return NextResponse.json({ ok: false, error: "email_not_verified" }, { status: 401 });
  }

  const selection = parseOfferSelection(payload.offer, payload.interval);
  if (!selection) {
    return NextResponse.json(
      { ok: false, error: "Unknown plan selection." },
      { status: 400 },
    );
  }

  try {
    const result = await startOfferCheckout({
      email,
      offer: selection.offer,
      interval: selection.interval,
    });

    switch (result.kind) {
      case "redirect":
        return NextResponse.json({ ok: true, action: "redirect", url: result.url });
      case "already_active":
        return NextResponse.json({
          ok: true,
          action: "already_active",
          billingManageable: result.billingManageable,
        });
      case "transition_required":
        return NextResponse.json({
          ok: true,
          action: "transition_required",
          currentOfferKey: result.currentOfferKey,
        });
      case "not_configured":
        // The missing variable name is operator context, not customer context.
        console.error(
          `[/api/billing/checkout] offer not configured. Missing: ${result.envVar}`,
        );
        return NextResponse.json(
          { ok: false, error: "That plan is not available right now." },
          { status: 503 },
        );
    }
  } catch (err) {
    console.error("[/api/billing/checkout] error:", err);
    return NextResponse.json(
      { ok: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
