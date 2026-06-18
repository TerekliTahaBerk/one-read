-- AlterTable
ALTER TABLE "Summary" ADD COLUMN     "adminEditedAt" TIMESTAMP(3),
ADD COLUMN     "previewTextOverride" TEXT,
ADD COLUMN     "subjectOverride" TEXT;

-- AlterTable
ALTER TABLE "TopicDailyPick" ADD COLUMN     "adminNotes" TEXT,
ADD COLUMN     "approvalStatus" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedBy" TEXT,
ADD COLUMN     "scheduledFor" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminAuditLog_targetType_targetId_idx" ON "AdminAuditLog"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "TopicDailyPick_approvalStatus_idx" ON "TopicDailyPick"("approvalStatus");

-- CreateIndex
CREATE INDEX "TopicDailyPick_scheduledFor_idx" ON "TopicDailyPick"("scheduledFor");

