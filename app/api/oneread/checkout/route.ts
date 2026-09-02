import { NextResponse } from "next/server";
import { parseEmail } from "@/lib/options";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/oneread/checkout
 * Body: { email: string }
 *
 * Closed legacy checkout. Existing legacy subscriptions remain recognised by
 * webhooks and account management, but new customers must use the semantic
 * `/api/billing/checkout` offer/interval endpoint.
 */
export async function POST(request: Request) {
  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  if (!parseEmail(payload.email)) {
    return NextResponse.json({ ok: false, error: "Please enter a valid email." }, { status: 400 });
  }
  return NextResponse.json(
    { ok: false, error: "legacy_checkout_retired", checkout: "/api/billing/checkout" },
    { status: 410 },
  );
}
