import { NextResponse } from "next/server";
import { parseEmail, parseBillingInterval } from "@/lib/options";
import { completeMockCheckout, isMockAllowed } from "@/lib/billing/mock";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/subscribe/mock/complete  (DEV/TEST ONLY)
 * Body: { email, plan }
 *
 * Completes a fake checkout: marks the subscription ACTIVE_PAID. Blocked in
 * production unless MOCK_BILLING_PREVIEW=true. No real payment is processed.
 */
export async function POST(request: Request) {
  if (!isMockAllowed()) {
    return NextResponse.json(
      { ok: false, error: "Mock billing is not available in this environment." },
      { status: 403 },
    );
  }

  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const email = parseEmail(payload.email);
  const plan = parseBillingInterval(payload.plan);
  if (!email || !plan) {
    return NextResponse.json({ ok: false, error: "Invalid email or plan." }, { status: 400 });
  }

  const result = await completeMockCheckout(email, plan);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.reason }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
