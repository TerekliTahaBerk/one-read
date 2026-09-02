import { parseEmail } from "@/lib/options";
import { ensureArticlePreferencesHolder, ensureOneReadSubscription } from "@/lib/oneread/access";
import { VERIFICATION_PURPOSES, confirmVerificationCode } from "@/lib/oneread/verification";
import { createMobileSession, mobileSessionConfigured } from "@/lib/mobile/session";
import { mobileData, mobileError } from "@/lib/mobile/response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!mobileSessionConfigured()) {
    return mobileError("TEMPORARILY_UNAVAILABLE", 503, "Sign in is temporarily unavailable.");
  }
  let body: { email?: unknown; code?: unknown; deviceLabel?: unknown };
  try { body = (await request.json()) as typeof body; } catch {
    return mobileError("INVALID_REQUEST", 400, "Enter your email and six-digit code.");
  }
  const email = parseEmail(body.email);
  const code = typeof body.code === "string" ? body.code.trim() : "";
  if (!email || !/^\d{6}$/.test(code)) {
    return mobileError("INVALID_REQUEST", 400, "Enter your email and six-digit code.");
  }
  const verified = await confirmVerificationCode({ email, purpose: VERIFICATION_PURPOSES.signup, code });
  if (!verified.ok) return mobileError("UNAUTHENTICATED", 401, "That code is invalid or has expired.");

  const oneRead = await ensureOneReadSubscription(email);
  await ensureArticlePreferencesHolder(oneRead.contactId);
  const session = await createMobileSession({
    contactId: oneRead.contactId,
    deviceLabel: typeof body.deviceLabel === "string" ? body.deviceLabel : null,
  });
  return mobileData({ token: session.token, expiresAt: session.expiresAt.toISOString() });
}
