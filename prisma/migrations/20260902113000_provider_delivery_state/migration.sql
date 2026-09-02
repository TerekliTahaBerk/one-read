-- Keep provider delivery telemetry separate from OneRead's logical send state.
ALTER TABLE "OneArticleDelivery"
ADD COLUMN "providerStatus" TEXT,
ADD COLUMN "providerStatusAt" TIMESTAMP(3);

CREATE INDEX "OneArticleDelivery_providerStatus_providerStatusAt_idx"
ON "OneArticleDelivery"("providerStatus", "providerStatusAt");

CREATE INDEX "OneArticleDelivery_providerMessageId_idx"
ON "OneArticleDelivery"("providerMessageId");

-- Supports OTP rate-limit windows without exposing or storing raw IP data.
CREATE INDEX "EmailVerificationCode_email_createdAt_idx"
ON "EmailVerificationCode"("email", "createdAt");

CREATE INDEX "EmailVerificationCode_ipHash_createdAt_idx"
ON "EmailVerificationCode"("ipHash", "createdAt");
