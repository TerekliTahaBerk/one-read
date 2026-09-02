-- Milestone C2 — billing offer identity + subscription transitions.
--
-- Strictly additive. Every column is nullable or carries a default, so existing
-- ProductSubscription and BillingEvent rows stay valid and readable with no
-- backfill. `offerKey` / `providerProductId` are deliberately left NULL on
-- historical rows: they mean "not yet classified", and inventing a value would
-- be a guess about what a grandfathered subscriber actually bought.

-- AlterTable
ALTER TABLE "BillingEvent" ADD COLUMN     "outcome" TEXT;

-- AlterTable
ALTER TABLE "ProductSubscription" ADD COLUMN     "offerKey" TEXT,
ADD COLUMN     "providerProductId" TEXT;

-- CreateTable
CREATE TABLE "SubscriptionTransition" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "fromOfferKey" TEXT,
    "fromInterval" TEXT,
    "fromProviderProductId" TEXT,
    "fromProviderSubscriptionId" TEXT,
    "fromGrandfathered" BOOLEAN NOT NULL DEFAULT false,
    "toOfferKey" TEXT NOT NULL,
    "toInterval" TEXT NOT NULL,
    "toProviderProductId" TEXT,
    "grandfatherAcknowledgedAt" TIMESTAMP(3),
    "prorationBehavior" TEXT,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionTransition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SubscriptionTransition_subscriptionId_state_idx" ON "SubscriptionTransition"("subscriptionId", "state");

-- CreateIndex
CREATE INDEX "SubscriptionTransition_state_idx" ON "SubscriptionTransition"("state");

-- AddForeignKey
ALTER TABLE "SubscriptionTransition" ADD CONSTRAINT "SubscriptionTransition_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionTransition" ADD CONSTRAINT "SubscriptionTransition_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "ProductSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

