import { createHash } from "crypto";
import { requireMobileSession, isMobileError } from "@/lib/mobile/authenticated";
import { mobileData, mobileError } from "@/lib/mobile/response";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await requireMobileSession(request);
  if (isMobileError(auth)) return auth;
  let body: { confirmation?: unknown };
  try { body = (await request.json()) as typeof body; } catch {
    return mobileError("INVALID_REQUEST", 400, "Type DELETE to confirm account deletion.");
  }
  if (body.confirmation !== "DELETE") {
    return mobileError("INVALID_REQUEST", 400, "Type DELETE to confirm account deletion.");
  }
  const suffix = createHash("sha256").update(`${auth.contactId}:${Date.now()}`).digest("hex").slice(0, 20);
  await prisma.$transaction(async (tx) => {
    await tx.pushDevice.deleteMany({ where: { contactId: auth.contactId } });
    await tx.readingState.deleteMany({ where: { contactId: auth.contactId } });
    await tx.oneArticleDelivery.deleteMany({ where: { contactId: auth.contactId } });
    await tx.articlePreferences.deleteMany({ where: { subscription: { contactId: auth.contactId } } });
    await tx.mobileSession.deleteMany({ where: { contactId: auth.contactId } });
    await tx.contact.update({
      where: { id: auth.contactId },
      data: { email: `deleted-${suffix}@deleted.invalid` },
    });
    await tx.productSubscription.updateMany({
      where: { contactId: auth.contactId },
      data: {
        emailDeliveryStatus: "UNSUBSCRIBED",
        adminNote: null,
        providerCheckoutSessionId: null,
      },
    });
  });
  return mobileData({ deleted: true });
}
