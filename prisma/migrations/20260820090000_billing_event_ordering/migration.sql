-- Additive launch-hardening metadata. No subscriber or legacy product data is removed.
ALTER TABLE "ProductSubscription"
ADD COLUMN "billingStateUpdatedAt" TIMESTAMP(3);

CREATE INDEX "ProductSubscription_billingStateUpdatedAt_idx"
ON "ProductSubscription"("billingStateUpdatedAt");
