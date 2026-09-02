-- Additive OneNews delivery persistence. Existing editorial, billing and
-- OneArticle data is not rewritten.
CREATE TABLE "OneNewsDelivery" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "productSubscriptionId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "providerMessageId" TEXT,
    "providerStatus" TEXT,
    "providerStatusAt" TIMESTAMP(3),
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "providerAcceptedAt" TIMESTAMP(3),
    "reconciliationRequiredAt" TIMESTAMP(3),
    "manualRecoveryAt" TIMESTAMP(3),
    "manualRecoveryBy" TEXT,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "failedReason" TEXT,
    "skippedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OneNewsDelivery_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "OneNewsDelivery_issueId_contactId_key" ON "OneNewsDelivery"("issueId", "contactId");
CREATE INDEX "OneNewsDelivery_issueId_status_idx" ON "OneNewsDelivery"("issueId", "status");
CREATE INDEX "OneNewsDelivery_productSubscriptionId_status_idx" ON "OneNewsDelivery"("productSubscriptionId", "status");
CREATE INDEX "OneNewsDelivery_status_lastAttemptAt_idx" ON "OneNewsDelivery"("status", "lastAttemptAt");
CREATE INDEX "OneNewsDelivery_providerMessageId_idx" ON "OneNewsDelivery"("providerMessageId");
CREATE INDEX "OneNewsDelivery_providerStatus_providerStatusAt_idx" ON "OneNewsDelivery"("providerStatus", "providerStatusAt");
ALTER TABLE "OneNewsDelivery" ADD CONSTRAINT "OneNewsDelivery_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "OneNewsIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OneNewsDelivery" ADD CONSTRAINT "OneNewsDelivery_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OneNewsDelivery" ADD CONSTRAINT "OneNewsDelivery_productSubscriptionId_fkey" FOREIGN KEY ("productSubscriptionId") REFERENCES "ProductSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
