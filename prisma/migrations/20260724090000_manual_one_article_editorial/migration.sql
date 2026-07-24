-- Additive OneArticle editorial publishing model. Legacy picks, summaries and
-- deliveries remain intact for history and rollback.

CREATE TABLE "OneArticleIssue" (
    "id" TEXT NOT NULL,
    "readingLanguage" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "scheduledFor" TIMESTAMP(3),
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Istanbul',
    "subject" TEXT NOT NULL,
    "previewText" TEXT,
    "headline" TEXT NOT NULL,
    "bodyText" TEXT NOT NULL,
    "bodyHtml" TEXT,
    "sourceTitle" TEXT,
    "sourceName" TEXT,
    "sourceUrl" TEXT,
    "ctaLabel" TEXT,
    "adminNotes" TEXT,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "readyAt" TIMESTAMP(3),
    "scheduledAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "claimedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OneArticleIssue_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OneArticleDelivery" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "productSubscriptionId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "providerMessageId" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "failedReason" TEXT,
    "skippedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OneArticleDelivery_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OneArticleIssue_status_scheduledFor_idx" ON "OneArticleIssue"("status", "scheduledFor");
CREATE INDEX "OneArticleIssue_readingLanguage_status_idx" ON "OneArticleIssue"("readingLanguage", "status");
CREATE INDEX "OneArticleIssue_createdAt_idx" ON "OneArticleIssue"("createdAt");
CREATE UNIQUE INDEX "OneArticleDelivery_issueId_contactId_key" ON "OneArticleDelivery"("issueId", "contactId");
CREATE INDEX "OneArticleDelivery_issueId_status_idx" ON "OneArticleDelivery"("issueId", "status");
CREATE INDEX "OneArticleDelivery_productSubscriptionId_status_idx" ON "OneArticleDelivery"("productSubscriptionId", "status");

ALTER TABLE "OneArticleDelivery" ADD CONSTRAINT "OneArticleDelivery_issueId_fkey"
FOREIGN KEY ("issueId") REFERENCES "OneArticleIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OneArticleDelivery" ADD CONSTRAINT "OneArticleDelivery_contactId_fkey"
FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OneArticleDelivery" ADD CONSTRAINT "OneArticleDelivery_productSubscriptionId_fkey"
FOREIGN KEY ("productSubscriptionId") REFERENCES "ProductSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
