import { NextResponse } from "next/server";
import { parseEmail } from "@/lib/options";
import { createOneReadCheckoutSession } from "@/lib/oneread/checkout";
import { hasVerifiedEmail } from "@/lib/oneread/verification";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/oneread/checkout
 * Body: { email: string }
 *
 * Starts the single OneRead checkout (currently covers OneArticle only).
 * Returns one of:
 *   { ok, action: "redirect", url }        — go complete checkout
 *   { ok, action: "needs_setup" }          — finish preferences first
 *   { ok, action: "already_active", url }  — manage billing instead
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
  if (!hasVerifiedEmail(email)) {
    return NextResponse.json({ ok: false, error: "email_not_verified" }, { status: 401 });
  }

  try {
    const result = await createOneReadCheckoutSession(email);
    switch (result.kind) {
      case "redirect":
        return NextResponse.json({ ok: true, action: "redirect", url: result.url });
      case "needs_setup_first":
        return NextResponse.json({ ok: true, action: "needs_setup_first" });
      case "needs_setup":
        return NextResponse.json({ ok: true, action: "needs_setup" });
      case "already_active":
        return NextResponse.json({ ok: true, action: "already_active", url: result.manageUrl });
    }
  } catch (err) {
    console.error("[/api/oneread/checkout] error:", err);
    return NextResponse.json(
      { ok: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
