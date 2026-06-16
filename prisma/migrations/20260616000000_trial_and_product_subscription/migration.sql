-- Trial + future-proof product-subscription model.
-- Additive only: the legacy "Subscriber" table is left intact. The new
-- productSubscriptionId columns on "DailySend"/"Feedback" are nullable so the
-- backfill (scripts/migrate-to-product-subscription.ts) can populate them
-- without downtime before cutover.

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductSubscription" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "productKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_PREFERENCES',
    "trialStartedAt" TIMESTAMP(3),
    "trialEndsAt" TIMESTAMP(3),
    "trialUsedAt" TIMESTAMP(3),
    "plan" TEXT,
    "paymentProvider" TEXT,
    "providerCustomerId" TEXT,
    "providerSubscriptionId" TEXT,
    "providerCheckoutSessionId" TEXT,
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "canceledAt" TIMESTAMP(3),
    "pastDueAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "emailDeliveryStatus" TEXT NOT NULL DEFAULT 'SUBSCRIBED',
    "unsubscribeToken" TEXT NOT NULL,
    "lastSentAt" TIMESTAMP(3),
    "adminOverride" BOOLEAN NOT NULL DEFAULT false,
    "adminNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArticlePreferences" (
    "id" TEXT NOT NULL,
    "productSubscriptionId" TEXT NOT NULL,
    "interests" TEXT[],
    "primaryInterest" TEXT,
    "secondaryInterests" TEXT[],
    "sourceLanguage" TEXT,
    "summaryLanguage" TEXT,
    "timezone" TEXT DEFAULT 'Europe/Istanbul',
    "deliveryHour" INTEGER NOT NULL DEFAULT 7,
    "preferredDifficulty" TEXT NOT NULL DEFAULT 'mixed',
    "recentlySentTopics" TEXT[],
    "recentlySentArticleIds" TEXT[],
    "feedbackProfile" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArticlePreferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingEvent_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "DailySend" ADD COLUMN "productSubscriptionId" TEXT;

-- AlterTable
ALTER TABLE "Feedback" ADD COLUMN "productSubscriptionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Contact_email_key" ON "Contact"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ProductSubscription_unsubscribeToken_key" ON "ProductSubscription"("unsubscribeToken");

-- CreateIndex
CREATE INDEX "ProductSubscription_productKey_status_idx" ON "ProductSubscription"("productKey", "status");

-- CreateIndex
CREATE INDEX "ProductSubscription_trialEndsAt_idx" ON "ProductSubscription"("trialEndsAt");

-- CreateIndex
CREATE INDEX "ProductSubscription_providerSubscriptionId_idx" ON "ProductSubscription"("providerSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductSubscription_contactId_productKey_key" ON "ProductSubscription"("contactId", "productKey");

-- CreateIndex
CREATE UNIQUE INDEX "ArticlePreferences_productSubscriptionId_key" ON "ArticlePreferences"("productSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "BillingEvent_providerEventId_key" ON "BillingEvent"("providerEventId");

-- AddForeignKey
ALTER TABLE "ProductSubscription" ADD CONSTRAINT "ProductSubscription_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticlePreferences" ADD CONSTRAINT "ArticlePreferences_productSubscriptionId_fkey" FOREIGN KEY ("productSubscriptionId") REFERENCES "ProductSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailySend" ADD CONSTRAINT "DailySend_productSubscriptionId_fkey" FOREIGN KEY ("productSubscriptionId") REFERENCES "ProductSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_productSubscriptionId_fkey" FOREIGN KEY ("productSubscriptionId") REFERENCES "ProductSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
