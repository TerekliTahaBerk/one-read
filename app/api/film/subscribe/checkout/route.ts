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
  if (!email) return NextResponse.json({ ok: false, error: "Please enter a valid email." }, { status: 400 });
  try {
    const result = await createOneFilmCheckoutSession(email);
    if (result.kind === "redirect") return NextResponse.json({ ok: true, action: "redirect", url: result.url });
    if (result.kind === "needs_setup_first") return NextResponse.json({ ok: true, action: "needs_setup_first" });
    if (result.kind === "needs_setup") return NextResponse.json({ ok: true, action: "needs_setup" });
    if (result.kind === "already_active") return NextResponse.json({ ok: true, action: "already_active", url: result.manageUrl });
    return NextResponse.json({ ok: false, action: "billing_not_configured", error: "OneFilm billing isn’t available yet. Please check back soon." });
  } catch (error) {
    console.error("[/api/film/subscribe/checkout] error:", error);
    return NextResponse.json({ ok: false, error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
