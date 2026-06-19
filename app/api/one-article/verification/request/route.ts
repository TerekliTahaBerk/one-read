import { NextResponse } from "next/server";
import { parseEmail } from "@/lib/options";
import {
  VERIFICATION_PURPOSES,
  emailVerificationSecretConfigured,
  hashMeta,
  requestVerificationCode,
} from "@/lib/one-article/verification";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/one-article/verification/request
 * Body: { email: string }
 *
 * Sends a 6-digit verification code. Always returns the same generic response
 * whether or not the email already exists, to avoid leaking account presence.
 */
const GENERIC = {
  ok: true,
  message: "If the email is valid, a verification code has been sent.",
};

export async function POST(req: Request) {
  if (!emailVerificationSecretConfigured()) {
    return NextResponse.json(
      { ok: false, error: "verification_not_configured" },
      { status: 503 },
    );
  }

  let body: { email?: unknown };
  try {
    body = (await req.json()) as { email?: unknown };
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_request" }, { status: 400 });
  }

  const email = parseEmail(body.email);
  // Generic response even on a malformed email — don't reveal validation state
  // that could be probed. (A truly empty body still returns generic success.)
  if (!email) {
    return NextResponse.json(GENERIC);
  }

  const ipRaw = (req.headers.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || null;
  const uaRaw = req.headers.get("user-agent");

  const result = await requestVerificationCode({
    email,
    purpose: VERIFICATION_PURPOSES.signup,
    ipHash: hashMeta(ipRaw),
    userAgentHash: hashMeta(uaRaw),
  });

  if (!result.ok) {
    // Surface cooldown/rate-limit so the UI can show a countdown, but still
    // generic about account existence.
    return NextResponse.json(
      {
        ok: false,
        error: result.reason,
        retryAfterSeconds: result.retryAfterSeconds,
      },
      { status: 429 },
    );
  }

  return NextResponse.json({
    ...GENERIC,
    cooldownSeconds: result.cooldownSeconds,
  });
}
