import { NextResponse } from "next/server";
import { parseEmail } from "@/lib/options";
import { createOneLingoCheckoutSession } from "@/lib/lingo/checkout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/lingo/subscribe/checkout
 * Body: { email: string }
 *
 * Resolves the OneLingo checkout step via Polar. Returns one of:
 *   { ok, action: "redirect", url }              — go complete checkout
 *   { ok, action: "needs_setup_first" }          — start setup first
 *   { ok, action: "needs_setup" }                — finish preferences first
 *   { ok, action: "already_active", url }        — manage billing instead
 *   { ok, action: "billing_not_configured" }     — Polar product id missing
 *
 * Polar remains the source of truth — success grants no access; the webhook does.
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

  try {
    const result = await createOneLingoCheckoutSession(email);
    switch (result.kind) {
      case "redirect":
        return NextResponse.json({ ok: true, action: "redirect", url: result.url });
      case "needs_setup_first":
        return NextResponse.json({ ok: true, action: "needs_setup_first" });
      case "needs_setup":
        return NextResponse.json({ ok: true, action: "needs_setup" });
      case "already_active":
        return NextResponse.json({ ok: true, action: "already_active", url: result.manageUrl });
      case "billing_not_configured":
        return NextResponse.json({
          ok: false,
          action: "billing_not_configured",
          error: "OneLingo billing isn’t available yet. Please check back soon.",
        });
    }
  } catch (err) {
    console.error("[/api/lingo/subscribe/checkout] error:", err);
    return NextResponse.json(
      { ok: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
