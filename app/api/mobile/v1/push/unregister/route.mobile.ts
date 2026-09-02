import { requireMobileSession, isMobileError } from "@/lib/mobile/authenticated";
import { mobileData, mobileError } from "@/lib/mobile/response";
import { hashPushToken } from "@/lib/mobile/session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await requireMobileSession(request);
  if (isMobileError(auth)) return auth;
  let body: { token?: unknown };
  try { body = (await request.json()) as typeof body; } catch {
    return mobileError("INVALID_REQUEST", 400, "Push registration is invalid.");
  }
  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (!token) return mobileError("INVALID_REQUEST", 400, "Push registration is invalid.");
  await prisma.pushDevice.updateMany({
    where: { contactId: auth.contactId, tokenHash: hashPushToken(token) },
    data: { enabled: false, revokedAt: new Date() },
  });
  return mobileData({ unregistered: true });
}
