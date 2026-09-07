-- AlterTable
ALTER TABLE "OneArticleIssue" ADD COLUMN     "publicationKey" TEXT,
ADD COLUMN     "topics" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "OneArticleDelivery" ADD COLUMN     "publicationKey" TEXT;

-- AlterTable
ALTER TABLE "OneNewsIssue" ADD COLUMN     "editorialRank" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "slotId" TEXT,
ADD COLUMN     "subtopics" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "topic" TEXT;

-- AlterTable
ALTER TABLE "OneNewsDelivery" ADD COLUMN     "firstAttemptAt" TIMESTAMP(3),
ADD COLUMN     "slotId" TEXT;

-- CreateTable
CREATE TABLE "OneNewsPreferences" (
    "id" TEXT NOT NULL,
    "productSubscriptionId" TEXT NOT NULL,
    "topics" TEXT[],
    "summaryLanguage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OneNewsPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OneNewsPublicationSlot" (
    "sealedAt" TIMESTAMP(3),
    "id" TEXT NOT NULL,
    "publicationAt" TIMESTAMP(3) NOT NULL,
    "readingLanguage" TEXT NOT NULL,

    CONSTRAINT "OneNewsPublicationSlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OneNewsPreferences_productSubscriptionId_key" ON "OneNewsPreferences"("productSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "OneNewsPublicationSlot_publicationAt_readingLanguage_key" ON "OneNewsPublicationSlot"("publicationAt", "readingLanguage");

-- CreateIndex
CREATE INDEX "OneArticleIssue_publicationKey_idx" ON "OneArticleIssue"("publicationKey");

-- CreateIndex
CREATE UNIQUE INDEX "OneArticleDelivery_publicationKey_contactId_key" ON "OneArticleDelivery"("publicationKey", "contactId");

-- CreateIndex
CREATE UNIQUE INDEX "OneNewsIssue_slotId_editorialRank_key" ON "OneNewsIssue"("slotId", "editorialRank");

-- CreateIndex
CREATE UNIQUE INDEX "OneNewsDelivery_slotId_contactId_key" ON "OneNewsDelivery"("slotId", "contactId");

-- AddForeignKey
ALTER TABLE "OneNewsPreferences" ADD CONSTRAINT "OneNewsPreferences_productSubscriptionId_fkey" FOREIGN KEY ("productSubscriptionId") REFERENCES "ProductSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OneNewsIssue" ADD CONSTRAINT "OneNewsIssue_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "OneNewsPublicationSlot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OneNewsDelivery" ADD CONSTRAINT "OneNewsDelivery_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "OneNewsPublicationSlot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Snapshot historical shared language once; never read another product's
-- preferences during delivery. Preserve all existing preference history.
-- Bundle preference holders inherit the bundle email state only at creation.
INSERT INTO "ProductSubscription" ("id", "contactId", "productKey", "status", "emailDeliveryStatus", "unsubscribeToken", "updatedAt")
SELECT 'news-holder-' || b."id", b."contactId", 'one-news', 'PENDING_PREFERENCES', b."emailDeliveryStatus", md5(random()::text || clock_timestamp()::text), CURRENT_TIMESTAMP
FROM "ProductSubscription" b
WHERE b."productKey" = 'one-read'
ON CONFLICT ("contactId", "productKey") DO NOTHING;

INSERT INTO "OneNewsPreferences" ("id", "productSubscriptionId", "topics", "summaryLanguage", "updatedAt")
SELECT 'news-prefs-' || n."id", n."id", ARRAY[]::TEXT[],
  COALESCE(own."summaryLanguage", bundle_pref."summaryLanguage", article_pref."summaryLanguage", 'English'), CURRENT_TIMESTAMP
FROM "ProductSubscription" n
LEFT JOIN "ArticlePreferences" own ON own."productSubscriptionId" = n."id"
LEFT JOIN "ProductSubscription" bundle ON bundle."contactId" = n."contactId" AND bundle."productKey" = 'one-read'
LEFT JOIN "ArticlePreferences" bundle_pref ON bundle_pref."productSubscriptionId" = bundle."id"
LEFT JOIN "ProductSubscription" article ON article."contactId" = n."contactId" AND article."productKey" = 'one-article'
LEFT JOIN "ArticlePreferences" article_pref ON article_pref."productSubscriptionId" = article."id"
WHERE n."productKey" = 'one-news'
ON CONFLICT ("productSubscriptionId") DO NOTHING;

ALTER TABLE "OneNewsIssue" ADD CONSTRAINT "OneNewsIssue_editorialRank_check" CHECK ("editorialRank" BETWEEN 0 AND 99);
-- Ungrouped historical issues/deliveries retain null slot identities and their
-- original provider keys. Only newly scheduled editions enter grouped delivery.
