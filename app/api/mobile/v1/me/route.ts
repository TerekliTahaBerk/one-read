import { prisma } from "@/lib/prisma";
import { requireMobileSession, isMobileError } from "@/lib/mobile/authenticated";
import { mobileData, mobileError } from "@/lib/mobile/response";
import { resolveTodayForContact } from "@/lib/mobile/today";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireMobileSession(request);
  if (isMobileError(auth)) return auth;
  const [contact, today] = await Promise.all([
    prisma.contact.findUnique({
      where: { id: auth.contactId },
      include: { subscriptions: { include: { preferences: true } } },
    }),
    resolveTodayForContact(auth.contactId),
  ]);
  if (!contact) return mobileError("UNAUTHENTICATED", 401, "Sign in again to continue.");
  const article = contact.subscriptions.find((item) => item.productKey === "one-article");
  return mobileData({
    account: { email: contact.email },
    accessState: today.state === "SUBSCRIPTION_REQUIRED" ? "SUBSCRIPTION_REQUIRED" : "ACTIVE_OR_PENDING",
    preferences: article?.preferences
      ? {
          interests: article.preferences.interests,
          sourceLanguage: article.preferences.sourceLanguage,
          readingLanguage: article.preferences.summaryLanguage,
          timezone: article.preferences.timezone,
        }
      : null,
  });
}
