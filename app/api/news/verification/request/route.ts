import { NextResponse } from "next/server";
import { parseEmail } from "@/lib/options";
import {
  NEWS_VERIFICATION_PURPOSES,
  emailVerificationSecretConfigured,
  hashMeta,
  requestNewsVerificationCode,
} from "@/lib/news/verification";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/news/verification/request
 * Body: { email: string }
 *
 * Sends a 6-digit OneNews verification code. Always returns the same generic
 * response whether or not the email exists, to avoid leaking account presence.
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
  if (!email) return NextResponse.json(GENERIC);

  const ipRaw = (req.headers.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || null;
  const uaRaw = req.headers.get("user-agent");

  const result = await requestNewsVerificationCode({
    email,
    purpose: NEWS_VERIFICATION_PURPOSES.signup,
    ipHash: hashMeta(ipRaw),
    userAgentHash: hashMeta(uaRaw),
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.reason, retryAfterSeconds: result.retryAfterSeconds },
      { status: 429 },
    );
  }

  return NextResponse.json({ ...GENERIC, cooldownSeconds: result.cooldownSeconds });
}
