import { ensureArticlePreferencesHolder } from "./access";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { articlePreferenceFields, articleTopics, parseProductPreferences, requiredPreferenceProducts, type EditorialPreferences } from "@/lib/product-preferences";
import type { OfferKey, ProductKey } from "@/lib/products/registry";

/** No billing or email fields are updated when an existing holder is edited. */
export async function ensureOneNewsPreferencesHolder(contactId: string, db: Prisma.TransactionClient = prisma) {
  const bundle = await db.productSubscription.findUnique({ where: { contactId_productKey: { contactId, productKey: "one-read" } } });
  return db.productSubscription.upsert({
    where: { contactId_productKey: { contactId, productKey: "one-news" } },
    update: {},
    create: { contactId, productKey: "one-news", status: "PENDING_PREFERENCES", emailDeliveryStatus: bundle?.emailDeliveryStatus ?? "SUBSCRIBED" },
    include: { newsPreferences: true },
  });
}

export async function saveProductPreferences(contactId: string, product: ProductKey, value: EditorialPreferences) {
  return prisma.$transaction(async (tx) => {
    const holder = product === "one-news"
      ? await ensureOneNewsPreferencesHolder(contactId, tx)
      : await ensureArticlePreferencesHolder(contactId, tx);
    if (product === "one-news") {
      await tx.oneNewsPreferences.upsert({ where: { productSubscriptionId: holder.id },
        update: value, create: { productSubscriptionId: holder.id, ...value } });
    } else {
      const fields = articlePreferenceFields(value);
      await tx.articlePreferences.upsert({ where: { productSubscriptionId: holder.id },
        update: fields, create: { productSubscriptionId: holder.id, sourceLanguage: "Any", ...fields } });
    }
  });
}

/** Required for new checkout, separately from the permissive legacy delivery contract. */
export async function offerPreferencesComplete(email: string, offer: OfferKey): Promise<boolean> {
  const contact = await prisma.contact.findUnique({ where: { email }, include: { subscriptions: { include: { preferences: true, newsPreferences: true } } } });
  return requiredPreferenceProducts(offer).every((product) => {
    const holder = contact?.subscriptions.find((row) => row.productKey === product);
    const value = product === "one-news" ? holder?.newsPreferences : holder?.preferences;
    return Boolean(value && parseProductPreferences({
      summaryLanguage: value.summaryLanguage,
      topics: product === "one-news" ? holder?.newsPreferences?.topics : articleTopics(holder?.preferences),
    }));
  });
}
