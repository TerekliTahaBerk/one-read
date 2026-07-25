-- Manual OneFilm editorial publishing. Legacy generated FilmDailyIssue and
-- FilmDailySend tables remain intact for history and rollback.
CREATE TABLE "OneFilmIssue" (
  "id" TEXT NOT NULL,
  "emailLanguage" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "scheduledFor" TIMESTAMP(3),
  "timezone" TEXT NOT NULL DEFAULT 'Europe/Istanbul',
  "subject" TEXT NOT NULL,
  "previewText" TEXT,
  "filmTitle" TEXT NOT NULL,
  "bodyText" TEXT NOT NULL,
  "bodyHtml" TEXT,
  "heroImageUrl" TEXT,
  "heroImageAlt" TEXT,
  "heroImageCredit" TEXT,
  "filmYear" INTEGER,
  "director" TEXT,
  "filmLanguage" TEXT,
  "runtimeMinutes" INTEGER,
  "sourceName" TEXT,
  "sourceUrl" TEXT,
  "ctaLabel" TEXT,
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
  CONSTRAINT "OneFilmIssue_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OneFilmDelivery" (
  "id" TEXT NOT NULL,
  "issueId" TEXT NOT NULL,
  "contactId" TEXT NOT NULL,
  "productSubscriptionId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'QUEUED',
  "providerMessageId" TEXT,
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "lastAttemptAt" TIMESTAMP(3),
  "sentAt" TIMESTAMP(3),
  "failedReason" TEXT,
  "skippedReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OneFilmDelivery_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OneFilmIssue_status_scheduledFor_idx" ON "OneFilmIssue"("status", "scheduledFor");
CREATE INDEX "OneFilmIssue_emailLanguage_status_idx" ON "OneFilmIssue"("emailLanguage", "status");
CREATE INDEX "OneFilmIssue_createdAt_idx" ON "OneFilmIssue"("createdAt");
CREATE UNIQUE INDEX "OneFilmDelivery_issueId_contactId_key" ON "OneFilmDelivery"("issueId", "contactId");
CREATE INDEX "OneFilmDelivery_issueId_status_idx" ON "OneFilmDelivery"("issueId", "status");
CREATE INDEX "OneFilmDelivery_productSubscriptionId_status_idx" ON "OneFilmDelivery"("productSubscriptionId", "status");

ALTER TABLE "OneFilmDelivery" ADD CONSTRAINT "OneFilmDelivery_issueId_fkey"
  FOREIGN KEY ("issueId") REFERENCES "OneFilmIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OneFilmDelivery" ADD CONSTRAINT "OneFilmDelivery_contactId_fkey"
  FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OneFilmDelivery" ADD CONSTRAINT "OneFilmDelivery_productSubscriptionId_fkey"
  FOREIGN KEY ("productSubscriptionId") REFERENCES "ProductSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
