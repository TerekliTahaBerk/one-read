import { NextResponse } from "next/server";
import { parseEmail } from "@/lib/options";
import { hasVerifiedEmail } from "@/lib/oneread/verification";
import { parseOfferSelection } from "@/lib/products/registry";
import { changeOffer, previewOfferChange } from "@/lib/billing/offer-checkout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/billing/plan-change
 * Body: { email, offer, interval, confirm?: boolean,
 *         acknowledgeGrandfatherLoss?: boolean }
 *
 * Two-step by design. Without `confirm: true` this only previews the change and
 * mutates nothing, so a UI can show what will happen — including the warning a
 * grandfathered subscriber must see — before anything is charged.
 *
 * A subscriber on a closed legacy price cannot be moved without
 * `acknowledgeGrandfatherLoss: true`; the preview step refuses and returns the
 * warning to display. Nothing in ordinary preference or account editing reaches
 * this route, so an upgrade cannot be triggered by accident.
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

  const selection = parseOfferSelection(payload.offer, payload.interval);
  if (!selection) {
    return NextResponse.json({ ok: false, error: "Unknown plan selection." }, { status: 400 });
  }

  const acknowledgeGrandfatherLoss = payload.acknowledgeGrandfatherLoss === true;
  const args = {
    email,
    offer: selection.offer,
    interval: selection.interval,
    acknowledgeGrandfatherLoss,
  };

  try {
    if (payload.confirm !== true) {
      const preview = await previewOfferChange(args);
      return preview.ok
        ? NextResponse.json({ ok: true, action: "preview", plan: preview.plan })
        : NextResponse.json(
            { ok: false, refusal: preview.refusal, error: preview.message },
            { status: 409 },
          );
    }

    const result = await changeOffer(args);
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, refusal: result.refusal, error: result.message },
        { status: 409 },
      );
    }
    return NextResponse.json({
      ok: true,
      action: "changed",
      state: result.state,
      appliedNow: result.appliedNow,
      effective: result.plan.effective,
    });
  } catch (err) {
    console.error("[/api/billing/plan-change] error:", err);
    return NextResponse.json(
      { ok: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
