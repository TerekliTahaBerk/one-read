-- Additive delivery recovery metadata. Existing rows remain valid and no
-- historical delivery or subscriber data is rewritten.
-- PostgreSQL truncated the original generated index name. Normalize it to the
-- name Prisma derives so migration/schema drift checks stay stable, without
-- editing the already-applied historical migration.
ALTER INDEX "OneArticleIssue_mobileEnabled_mobileExploreEnabled_mobilePriority_idx"
RENAME TO "OneArticleIssue_mobileEnabled_mobileExploreEnabled_mobilePr_idx";

ALTER TABLE "OneArticleDelivery"
ADD COLUMN "providerAcceptedAt" TIMESTAMP(3),
ADD COLUMN "reconciliationRequiredAt" TIMESTAMP(3),
ADD COLUMN "manualRecoveryAt" TIMESTAMP(3),
ADD COLUMN "manualRecoveryBy" TEXT;

CREATE INDEX "OneArticleDelivery_status_lastAttemptAt_idx"
ON "OneArticleDelivery"("status", "lastAttemptAt");
