import { parseEmail } from "@/lib/options";
import {
  VERIFICATION_PURPOSES,
  emailVerificationSecretConfigured,
  hashMeta,
  requestVerificationCode,
} from "@/lib/oneread/verification";
import { mobileData, mobileError } from "@/lib/mobile/response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!emailVerificationSecretConfigured()) {
    return mobileError("TEMPORARILY_UNAVAILABLE", 503, "Sign in is temporarily unavailable.");
  }
  let value: unknown;
  try { value = await request.json(); } catch { value = null; }
  const email = parseEmail((value as { email?: unknown } | null)?.email);
  if (!email) return mobileData({ message: "If the email is valid, a code has been sent.", cooldownSeconds: 60 });

  const result = await requestVerificationCode({
    email,
    purpose: VERIFICATION_PURPOSES.signup,
    ipHash: hashMeta((request.headers.get("x-forwarded-for") ?? "").split(",")[0]?.trim()),
    userAgentHash: hashMeta(request.headers.get("user-agent")),
  });
  if (!result.ok) {
    return mobileError("RATE_LIMITED", 429, `Try again in ${result.retryAfterSeconds} seconds.`);
  }
  if (!result.emailSent && process.env.NODE_ENV === "production") {
    return mobileError("TEMPORARILY_UNAVAILABLE", 503, "The code could not be delivered.");
  }
  return mobileData({
    message: "If the email is valid, a code has been sent.",
    cooldownSeconds: result.cooldownSeconds,
    ...(result.devCode ? { developmentCode: result.devCode } : {}),
  });
}
