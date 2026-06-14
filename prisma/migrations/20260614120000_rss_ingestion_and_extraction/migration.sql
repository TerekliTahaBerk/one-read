-- One Read — RSS ingestion + article extraction support.
--
-- Additive only: new columns, a new `Source` table, and supporting
-- indexes. No columns are dropped or retyped, so existing Article /
-- Summary / Subscriber data is preserved.
--
-- Note: dev environments that received these changes via `prisma db push`
-- should mark this migration as already applied:
--     npx prisma migrate resolve --applied 20260614120000_rss_ingestion_and_extraction
-- Fresh databases pick it up normally through `prisma migrate deploy`.

-- AlterTable
ALTER TABLE "Subscriber" ADD COLUMN     "unsubscribedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Article" ADD COLUMN     "canonicalUrl" TEXT,
ADD COLUMN     "cleanedText" TEXT,
ADD COLUMN     "detectedInterests" TEXT[],
ADD COLUMN     "extractionConfidence" DOUBLE PRECISION,
ADD COLUMN     "originalityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "readabilityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "scoringStatus" TEXT NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "Summary" ADD COLUMN     "confidence" DOUBLE PRECISION,
ADD COLUMN     "generator" TEXT,
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'READY',
ADD COLUMN     "structuredJson" JSONB;

-- CreateTable
CREATE TABLE "Source" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "feedUrl" TEXT NOT NULL,
    "homepage" TEXT,
    "defaultTopic" TEXT NOT NULL,
    "defaultSubtopics" TEXT[],
    "language" TEXT NOT NULL DEFAULT 'English',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "lastFetchedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Source_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Source_slug_key" ON "Source"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Source_feedUrl_key" ON "Source"("feedUrl");

-- CreateIndex
CREATE UNIQUE INDEX "Article_canonicalUrl_key" ON "Article"("canonicalUrl");

-- CreateIndex
CREATE INDEX "Article_scoringStatus_idx" ON "Article"("scoringStatus");
