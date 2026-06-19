import { NextResponse } from "next/server";
import { parseEmail } from "@/lib/options";
import {
  findOneLingoSubscription,
  lingoPreferencesComplete,
} from "@/lib/lingo/subscriptions";
import { createOneLingoPortalSession } from "@/lib/lingo/checkout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/lingo/subscribe/portal
 * Body: { email: string }
 *
 * Returns a Polar customer-portal URL for an existing OneLingo subscriber.
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

  try {
    const sub = await findOneLingoSubscription(email);
    if (!sub) {
      return NextResponse.json({ ok: true, action: "needs_setup_first" });
    }
    if (!lingoPreferencesComplete(sub.lingoPreferences)) {
      return NextResponse.json({ ok: true, action: "needs_setup" });
    }
    if (
      sub.status === "PENDING_CHECKOUT" ||
      sub.status === "PENDING_PREFERENCES" ||
      (sub.paymentProvider === "polar" && !sub.providerCustomerId)
    ) {
      return NextResponse.json({ ok: true, action: "needs_checkout" });
    }
    const { url } = await createOneLingoPortalSession(email);
    return NextResponse.json({ ok: true, action: "redirect", url });
  } catch (err) {
    console.error("[/api/lingo/subscribe/portal] error:", err);
    return NextResponse.json(
      { ok: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
