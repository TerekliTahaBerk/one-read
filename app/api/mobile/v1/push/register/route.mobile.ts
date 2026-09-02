import { requireMobileSession, isMobileError } from "@/lib/mobile/authenticated";
import { mobileData, mobileError } from "@/lib/mobile/response";
import { hashPushToken } from "@/lib/mobile/session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function validTimezone(value: string): boolean {
  try { new Intl.DateTimeFormat("en", { timeZone: value }).format(); return true; } catch { return false; }
}

export async function POST(request: Request) {
  const auth = await requireMobileSession(request);
  if (isMobileError(auth)) return auth;
  let body: { token?: unknown; platform?: unknown; timezone?: unknown };
  try { body = (await request.json()) as typeof body; } catch {
    return mobileError("INVALID_REQUEST", 400, "Push registration is invalid.");
  }
  const token = typeof body.token === "string" ? body.token.trim() : "";
  const timezone = typeof body.timezone === "string" ? body.timezone : "";
  if (!/^(?:Exponent|Expo)PushToken\[[A-Za-z0-9_-]+\]$/.test(token) || body.platform !== "ios" || !validTimezone(timezone)) {
    return mobileError("INVALID_REQUEST", 400, "Push registration is invalid.");
  }
  const tokenHash = hashPushToken(token);
  await prisma.pushDevice.upsert({
    where: { tokenHash },
    update: { contactId: auth.contactId, providerToken: token, platform: "ios", timezone, enabled: true, revokedAt: null, lastSeenAt: new Date() },
    create: { contactId: auth.contactId, providerToken: token, tokenHash, platform: "ios", timezone },
  });
  return mobileData({ registered: true });
}
