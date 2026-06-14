import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseEmail } from "@/lib/options";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/signup/start
 * Body: { email: string }
 *
 * Idempotently registers an email. If the subscriber already exists, the
 * record is left alone (preferences may already be saved). Returns success
 * either way so the user can continue to step 2.
 */
export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request." },
      { status: 400 },
    );
  }

  const email = parseEmail((payload as { email?: unknown })?.email);
  if (!email) {
    return NextResponse.json(
      { ok: false, error: "Please enter a valid email." },
      { status: 400 },
    );
  }

  try {
    // Upsert by email. If it exists, we deliberately don't reset status —
    // an ACTIVE subscriber who re-enters their email can still update prefs.
    await prisma.subscriber.upsert({
      where: { email },
      update: {},
      create: {
        email,
        interests: [],
        status: "PENDING_PREFERENCES",
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    // Don't leak internal errors to the client.
    console.error("[/api/signup/start] db error:", err);
    return NextResponse.json(
      { ok: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
