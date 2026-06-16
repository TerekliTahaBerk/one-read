import { NextResponse } from "next/server";
import { parseEmail } from "@/lib/options";
import {
  isMockAllowed,
  mockCancelAtPeriodEnd,
  mockResume,
  mockPaymentFailed,
  mockPaymentRecovered,
} from "@/lib/billing/mock";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ACTIONS = ["cancel", "resume", "fail", "recover"] as const;
type MockAction = (typeof ACTIONS)[number];

/**
 * POST /api/subscribe/mock/action  (DEV/TEST ONLY)
 * Body: { email, action: "cancel" | "resume" | "fail" | "recover" }
 *
 * Drives the mock subscription lifecycle from the mock portal. Blocked in
 * production unless MOCK_BILLING_PREVIEW=true.
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
  const action = payload.action as MockAction;
  if (!email || !ACTIONS.includes(action)) {
    return NextResponse.json({ ok: false, error: "Invalid email or action." }, { status: 400 });
  }

  const run = {
    cancel: mockCancelAtPeriodEnd,
    resume: mockResume,
    fail: mockPaymentFailed,
    recover: mockPaymentRecovered,
  }[action];

  const result = await run(email);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.reason }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
