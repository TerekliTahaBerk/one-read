import { NextResponse } from "next/server";
import { parseEmail } from "@/lib/options";
import {
  createPolarCheckoutForSubscription,
  isPolarConfigured,
} from "@/lib/billing/polar";
import { findOneArticleSubscription, preferencesComplete } from "@/lib/subscriptions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const email = parseEmail(url.searchParams.get("customerEmail"));

  if (!email) {
    return NextResponse.json({ ok: false, error: "Email is required." }, { status: 400 });
  }
  if (!isPolarConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Checkout is not configured." },
      { status: 503 },
    );
  }

  const sub = await findOneArticleSubscription(email);
  if (!sub) {
    return NextResponse.json({ ok: true, action: "needs_setup_first" });
  }
  if (!preferencesComplete(sub.preferences)) {
    return NextResponse.json({ ok: true, action: "needs_setup" });
  }

  const checkoutUrl = await createPolarCheckoutForSubscription(sub, email);
  return NextResponse.redirect(checkoutUrl, { status: 303 });
}
