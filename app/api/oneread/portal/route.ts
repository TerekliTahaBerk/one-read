import { NextResponse } from "next/server";
import { parseEmail } from "@/lib/options";
import { hasVerifiedEmail } from "@/lib/oneread/verification";
import { createOfferPortalUrl } from "@/lib/billing/offer-checkout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/oneread/portal
 * Body: { email: string }
 *
 * Returns a Polar billing-portal URL for an existing OneRead subscriber.
 */
export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const email = parseEmail((payload as { email?: unknown })?.email);
  if (!email) {
    return NextResponse.json({ ok: false, error: "Please enter a valid email." }, { status: 400 });
  }
  if (!hasVerifiedEmail(email)) {
    return NextResponse.json({ ok: false, error: "email_not_verified" }, { status: 401 });
  }

  try {
    const url = await createOfferPortalUrl(email);
    return NextResponse.json({ ok: true, action: "redirect", url });
  } catch (err) {
    console.error("[/api/oneread/portal] error:", err);
    return NextResponse.json(
      { ok: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
