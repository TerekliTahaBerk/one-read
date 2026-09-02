-- Milestone C3 — OneNews editorial domain.
--
-- Strictly additive: three new tables and their indexes/foreign keys. No
-- existing table, column, row or enum is altered or dropped. The OneNews
-- tables removed by 20260703070741_remove_one_news are NOT resurrected —
-- these are new, product-specific models with new names.

-- CreateTable
CREATE TABLE "OneNewsIssue" (
    "id" TEXT NOT NULL,
    "readingLanguage" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "scheduledFor" TIMESTAMP(3),
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Istanbul',
    "subject" TEXT NOT NULL,
    "previewText" TEXT,
    "headline" TEXT NOT NULL,
    "dek" TEXT NOT NULL,
    "whatHappened" TEXT NOT NULL,
    "whyItMatters" TEXT NOT NULL,
    "whatsContested" TEXT,
    "whatToWatch" TEXT NOT NULL,
    "developing" BOOLEAN NOT NULL DEFAULT false,
    "asOf" TIMESTAMP(3),
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

    CONSTRAINT "OneNewsIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OneNewsSource" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "publication" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL DEFAULT 'REPORTING',
    "publishedAt" TIMESTAMP(3),
    "accessedAt" TIMESTAMP(3),
    "note" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OneNewsSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OneNewsCorrection" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "correctionEmailRecommended" BOOLEAN NOT NULL DEFAULT false,
    "correctionEmailDecision" TEXT NOT NULL DEFAULT 'PENDING',
    "correctionEmailDecidedAt" TIMESTAMP(3),
    "correctionEmailDecidedBy" TEXT,
    "versionBefore" INTEGER NOT NULL,
    "versionAfter" INTEGER NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OneNewsCorrection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OneNewsIssue_status_scheduledFor_idx" ON "OneNewsIssue"("status", "scheduledFor");

-- CreateIndex
CREATE INDEX "OneNewsIssue_readingLanguage_status_idx" ON "OneNewsIssue"("readingLanguage", "status");

-- CreateIndex
CREATE INDEX "OneNewsIssue_createdAt_idx" ON "OneNewsIssue"("createdAt");

-- CreateIndex
CREATE INDEX "OneNewsSource_issueId_sortOrder_idx" ON "OneNewsSource"("issueId", "sortOrder");

-- CreateIndex
CREATE INDEX "OneNewsCorrection_issueId_createdAt_idx" ON "OneNewsCorrection"("issueId", "createdAt");

-- AddForeignKey
ALTER TABLE "OneNewsSource" ADD CONSTRAINT "OneNewsSource_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "OneNewsIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OneNewsCorrection" ADD CONSTRAINT "OneNewsCorrection_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "OneNewsIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
