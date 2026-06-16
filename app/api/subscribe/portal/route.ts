import { NextResponse } from "next/server";
import { parseEmail } from "@/lib/options";
import { getBillingProvider } from "@/lib/billing/provider";
import { findOneArticleSubscription } from "@/lib/subscriptions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/subscribe/portal
 * Body: { email: string }
 *
 * Returns a billing-portal URL for an existing subscriber. For the mock
 * provider this is the local mock portal page.
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
    const sub = await findOneArticleSubscription(email);
    if (!sub) {
      return NextResponse.json({ ok: true, action: "needs_setup_first" });
    }
    const { url } = await getBillingProvider().createBillingPortalSession(email);
    return NextResponse.json({ ok: true, action: "redirect", url });
  } catch (err) {
    console.error("[/api/subscribe/portal] error:", err);
    return NextResponse.json(
      { ok: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
