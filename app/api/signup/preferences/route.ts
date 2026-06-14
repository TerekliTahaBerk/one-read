import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  parseEmail,
  parseInterests,
  parseSourceLanguage,
  parseSummaryLanguage,
} from "@/lib/options";
import { sendWelcomeEmail } from "@/lib/resend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/signup/preferences
 * Body: {
 *   email: string,
 *   interests: string[],
 *   sourceLanguage: "English" | "Turkish" | "Any",
 *   summaryLanguage: "English" | "Turkish"
 * }
 *
 * Updates the subscriber's preferences and marks them ACTIVE. Sends a
 * welcome email via Resend, but never blocks success on email delivery.
 */
export async function POST(request: Request) {
  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request." },
      { status: 400 },
    );
  }

  const email = parseEmail(payload.email);
  if (!email) {
    return NextResponse.json(
      { ok: false, error: "Please enter a valid email." },
      { status: 400 },
    );
  }

  const interests = parseInterests(payload.interests);
  if (!interests) {
    return NextResponse.json(
      { ok: false, error: "Please choose at least one interest." },
      { status: 400 },
    );
  }

  const sourceLanguage = parseSourceLanguage(payload.sourceLanguage);
  if (!sourceLanguage) {
    return NextResponse.json(
      { ok: false, error: "Please choose a source language." },
      { status: 400 },
    );
  }

  const summaryLanguage = parseSummaryLanguage(payload.summaryLanguage);
  if (!summaryLanguage) {
    return NextResponse.json(
      { ok: false, error: "Please choose a summary language." },
      { status: 400 },
    );
  }

  try {
    // Upsert handles the edge case where someone hits step 2 directly
    // (e.g. resumed flow) without an existing record.
    await prisma.subscriber.upsert({
      where: { email },
      update: {
        interests,
        sourceLanguage,
        summaryLanguage,
        status: "ACTIVE",
      },
      create: {
        email,
        interests,
        sourceLanguage,
        summaryLanguage,
        status: "ACTIVE",
      },
    });
  } catch (err) {
    console.error("[/api/signup/preferences] db error:", err);
    return NextResponse.json(
      { ok: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }

  // Fire-and-await, but never propagate failures to the client.
  // sendWelcomeEmail catches its own errors internally.
  await sendWelcomeEmail(email);

  return NextResponse.json({ ok: true });
}
