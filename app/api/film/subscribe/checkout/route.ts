import { NextResponse } from "next/server";
import { parseEmail } from "@/lib/options";
import { createOneFilmCheckoutSession } from "@/lib/film/checkout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  try {
    const result = await createOneFilmCheckoutSession(email);
    switch (result.kind) {
      case "redirect":
        return NextResponse.json({ ok: true, action: "redirect", url: result.url });
      case "needs_setup_first":
        return NextResponse.json({ ok: true, action: "needs_setup_first" });
      case "needs_setup":
        return NextResponse.json({ ok: true, action: "needs_setup" });
      case "already_active":
        return NextResponse.json({ ok: true, action: "already_active", url: result.manageUrl });
      case "billing_not_configured":
        return NextResponse.json({
          ok: false,
          action: "billing_not_configured",
          error: "OneFilm billing isn’t available yet. Please check back soon.",
        });
    }
  } catch (err) {
    console.error("[/api/film/subscribe/checkout] error:", err);
    return NextResponse.json(
      { ok: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
