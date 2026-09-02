import { prisma } from "@/lib/prisma";
import { requireMobileSession, isMobileError } from "@/lib/mobile/authenticated";
import { mobileData, mobileError } from "@/lib/mobile/response";
import { parseInterests, parseSourceLanguage, parseSummaryLanguage, ONE_ARTICLE_PRODUCT_KEY } from "@/lib/options";
import { interestLabelsToSlugs } from "@/lib/topics";
import { ensureArticlePreferencesHolder, markOneReadReadyForCheckoutIfEligible } from "@/lib/oneread/access";
import { upsertArticlePreferences } from "@/lib/subscriptions";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireMobileSession(request);
  if (isMobileError(auth)) return auth;
  const holder = await prisma.productSubscription.findUnique({
    where: { contactId_productKey: { contactId: auth.contactId, productKey: ONE_ARTICLE_PRODUCT_KEY } },
    include: { preferences: true },
  });
  return mobileData(holder?.preferences ? {
    interests: holder.preferences.interests,
    sourceLanguage: holder.preferences.sourceLanguage,
    readingLanguage: holder.preferences.summaryLanguage,
    timezone: holder.preferences.timezone,
  } : null);
}

export async function PUT(request: Request) {
  const auth = await requireMobileSession(request);
  if (isMobileError(auth)) return auth;
  let body: Record<string, unknown>;
  try { body = (await request.json()) as Record<string, unknown>; } catch {
    return mobileError("INVALID_REQUEST", 400, "Choose valid reading preferences.");
  }
  const interests = parseInterests(body.interests);
  const sourceLanguage = parseSourceLanguage(body.sourceLanguage);
  const summaryLanguage = parseSummaryLanguage(body.readingLanguage);
  if (!interests || !sourceLanguage || !summaryLanguage) {
    return mobileError("INVALID_REQUEST", 400, "Choose valid reading preferences.");
  }
  const holder = await ensureArticlePreferencesHolder(auth.contactId);
  const slugs = interestLabelsToSlugs(interests);
  await upsertArticlePreferences(holder.id, {
    interests,
    primaryInterest: slugs[0] ?? null,
    secondaryInterests: slugs.slice(1),
    sourceLanguage,
    summaryLanguage,
  });
  await markOneReadReadyForCheckoutIfEligible(auth.contactId);
  return mobileData({ saved: true });
}
