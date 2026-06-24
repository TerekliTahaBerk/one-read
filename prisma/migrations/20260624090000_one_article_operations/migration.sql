-- OneArticle operations console support.

-- Allow manually-authored issues without a linked source article. Existing
-- rows keep their article id; if a source article is deleted later, the issue
-- remains visible for audit/history.
ALTER TABLE "TopicDailyPick" DROP CONSTRAINT IF EXISTS "TopicDailyPick_articleId_fkey";
ALTER TABLE "TopicDailyPick" ALTER COLUMN "articleId" DROP NOT NULL;
ALTER TABLE "TopicDailyPick"
  ADD CONSTRAINT "TopicDailyPick_articleId_fkey"
  FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Preserve generated summary content while allowing admin/manual overrides.
ALTER TABLE "Summary"
  ADD COLUMN "bodyTextOverride" TEXT,
  ADD COLUMN "bodyHtmlOverride" TEXT,
  ADD COLUMN "structuredJsonOverride" JSONB;

-- Structured cron/admin pipeline run history.
CREATE TABLE "OperationalRun" (
  "id" TEXT NOT NULL,
  "productKey" TEXT NOT NULL,
  "route" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'RUNNING',
  "dryRun" BOOLEAN NOT NULL DEFAULT false,
  "requireApproval" BOOLEAN NOT NULL DEFAULT true,
  "generatedCount" INTEGER NOT NULL DEFAULT 0,
  "sentCount" INTEGER NOT NULL DEFAULT 0,
  "skippedCount" INTEGER NOT NULL DEFAULT 0,
  "failedCount" INTEGER NOT NULL DEFAULT 0,
  "error" TEXT,
  "metadata" JSONB,

  CONSTRAINT "OperationalRun_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OperationalRun_productKey_startedAt_idx" ON "OperationalRun"("productKey", "startedAt");
CREATE INDEX "OperationalRun_route_startedAt_idx" ON "OperationalRun"("route", "startedAt");
CREATE INDEX "OperationalRun_status_idx" ON "OperationalRun"("status");
