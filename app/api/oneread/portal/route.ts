import { NextResponse } from "next/server";
import { parseEmail } from "@/lib/options";
import { createOneReadPortalUrl } from "@/lib/oneread/checkout";
import { resolveOneReadState } from "@/lib/oneread/access";
import { hasVerifiedEmail } from "@/lib/oneread/verification";

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
    const state = await resolveOneReadState(email);
    if (state.state === "new" || state.state === "incomplete") {
      return NextResponse.json({ ok: true, action: "needs_setup" });
    }
    if (state.state === "checkout_needed") {
      return NextResponse.json({ ok: true, action: "needs_checkout" });
    }
    const url = await createOneReadPortalUrl(email);
    return NextResponse.json({ ok: true, action: "redirect", url });
  } catch (err) {
    console.error("[/api/oneread/portal] error:", err);
    return NextResponse.json(
      { ok: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
