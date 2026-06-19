-- CreateTable
CREATE TABLE "NewsPreferences" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "productSubscriptionId" TEXT NOT NULL,
    "briefingLanguage" TEXT NOT NULL,
    "regionFocus" TEXT NOT NULL,
    "topics" TEXT[],
    "excludedTopics" TEXT[],
    "tone" TEXT NOT NULL DEFAULT 'calm',
    "depth" TEXT NOT NULL DEFAULT 'short',
    "sourcePreference" TEXT NOT NULL DEFAULT 'balanced',
    "wantsWorld" BOOLEAN NOT NULL DEFAULT true,
    "wantsBusiness" BOOLEAN NOT NULL DEFAULT true,
    "wantsTechnology" BOOLEAN NOT NULL DEFAULT true,
    "wantsCulture" BOOLEAN NOT NULL DEFAULT false,
    "wantsScience" BOOLEAN NOT NULL DEFAULT false,
    "wantsSports" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsDailyIssue" (
    "id" TEXT NOT NULL,
    "issueDate" DATE NOT NULL,
    "segmentKey" TEXT NOT NULL,
    "briefingLanguage" TEXT NOT NULL,
    "regionFocus" TEXT NOT NULL,
    "topics" TEXT[],
    "title" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "previewText" TEXT,
    "contentJson" JSONB NOT NULL,
    "htmlBody" TEXT,
    "textBody" TEXT,
    "status" TEXT NOT NULL DEFAULT 'GENERATED',
    "approvalStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "scheduledFor" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "adminNotes" TEXT,
    "generationProvider" TEXT,
    "generationModel" TEXT,
    "generationMetadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsDailyIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsDailySend" (
    "id" TEXT NOT NULL,
    "issueDate" DATE NOT NULL,
    "contactId" TEXT NOT NULL,
    "productSubscriptionId" TEXT NOT NULL,
    "newsDailyIssueId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "skippedReason" TEXT,
    "failedReason" TEXT,
    "providerMessageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsDailySend_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsSourceStory" (
    "id" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "excerpt" TEXT,
    "topic" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "storyDate" DATE NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsSourceStory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FilmPreferences" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "productSubscriptionId" TEXT NOT NULL,
    "emailLanguage" TEXT NOT NULL,
    "preferredGenres" TEXT[],
    "moods" TEXT[],
    "decades" TEXT[],
    "languages" TEXT[],
    "platforms" TEXT[],
    "spoilerPreference" TEXT NOT NULL DEFAULT 'spoiler-light',
    "familiarity" TEXT NOT NULL DEFAULT 'mixed',
    "runtimePreference" TEXT NOT NULL DEFAULT 'any',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FilmPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FilmDailyIssue" (
    "id" TEXT NOT NULL,
    "issueDate" DATE NOT NULL,
    "segmentKey" TEXT NOT NULL,
    "emailLanguage" TEXT NOT NULL,
    "genres" TEXT[],
    "moods" TEXT[],
    "filmTitle" TEXT,
    "filmYear" INTEGER,
    "director" TEXT,
    "filmLanguage" TEXT,
    "runtimeMinutes" INTEGER,
    "sourceUrl" TEXT,
    "title" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "previewText" TEXT,
    "contentJson" JSONB NOT NULL,
    "htmlBody" TEXT,
    "textBody" TEXT,
    "status" TEXT NOT NULL DEFAULT 'GENERATED',
    "approvalStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "scheduledFor" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "adminNotes" TEXT,
    "generationProvider" TEXT,
    "generationModel" TEXT,
    "generationMetadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FilmDailyIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FilmDailySend" (
    "id" TEXT NOT NULL,
    "issueDate" DATE NOT NULL,
    "contactId" TEXT NOT NULL,
    "productSubscriptionId" TEXT NOT NULL,
    "filmDailyIssueId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "skippedReason" TEXT,
    "failedReason" TEXT,
    "providerMessageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FilmDailySend_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FilmCatalogEntry" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "year" INTEGER,
    "director" TEXT,
    "filmLanguage" TEXT,
    "runtimeMinutes" INTEGER,
    "sourceUrl" TEXT,
    "adminNote" TEXT,
    "genres" TEXT[],
    "moods" TEXT[],
    "spoilerLevel" TEXT NOT NULL DEFAULT 'spoiler-light',
    "usedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FilmCatalogEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NewsPreferences_productSubscriptionId_key" ON "NewsPreferences"("productSubscriptionId");
CREATE INDEX "NewsPreferences_contactId_idx" ON "NewsPreferences"("contactId");
CREATE INDEX "NewsPreferences_briefingLanguage_idx" ON "NewsPreferences"("briefingLanguage");
CREATE INDEX "NewsPreferences_regionFocus_idx" ON "NewsPreferences"("regionFocus");

-- CreateIndex
CREATE INDEX "NewsDailyIssue_issueDate_idx" ON "NewsDailyIssue"("issueDate");
CREATE INDEX "NewsDailyIssue_briefingLanguage_regionFocus_idx" ON "NewsDailyIssue"("briefingLanguage", "regionFocus");
CREATE INDEX "NewsDailyIssue_approvalStatus_idx" ON "NewsDailyIssue"("approvalStatus");
CREATE UNIQUE INDEX "NewsDailyIssue_issueDate_segmentKey_key" ON "NewsDailyIssue"("issueDate", "segmentKey");

-- CreateIndex
CREATE INDEX "NewsDailySend_newsDailyIssueId_idx" ON "NewsDailySend"("newsDailyIssueId");
CREATE INDEX "NewsDailySend_status_idx" ON "NewsDailySend"("status");
CREATE UNIQUE INDEX "NewsDailySend_issueDate_contactId_key" ON "NewsDailySend"("issueDate", "contactId");

-- CreateIndex
CREATE INDEX "NewsSourceStory_storyDate_idx" ON "NewsSourceStory"("storyDate");
CREATE INDEX "NewsSourceStory_region_language_idx" ON "NewsSourceStory"("region", "language");
CREATE INDEX "NewsSourceStory_topic_idx" ON "NewsSourceStory"("topic");

-- CreateIndex
CREATE UNIQUE INDEX "FilmPreferences_productSubscriptionId_key" ON "FilmPreferences"("productSubscriptionId");
CREATE INDEX "FilmPreferences_contactId_idx" ON "FilmPreferences"("contactId");
CREATE INDEX "FilmPreferences_emailLanguage_idx" ON "FilmPreferences"("emailLanguage");

-- CreateIndex
CREATE INDEX "FilmDailyIssue_issueDate_idx" ON "FilmDailyIssue"("issueDate");
CREATE INDEX "FilmDailyIssue_emailLanguage_idx" ON "FilmDailyIssue"("emailLanguage");
CREATE INDEX "FilmDailyIssue_approvalStatus_idx" ON "FilmDailyIssue"("approvalStatus");
CREATE UNIQUE INDEX "FilmDailyIssue_issueDate_segmentKey_key" ON "FilmDailyIssue"("issueDate", "segmentKey");

-- CreateIndex
CREATE INDEX "FilmDailySend_filmDailyIssueId_idx" ON "FilmDailySend"("filmDailyIssueId");
CREATE INDEX "FilmDailySend_status_idx" ON "FilmDailySend"("status");
CREATE UNIQUE INDEX "FilmDailySend_issueDate_contactId_key" ON "FilmDailySend"("issueDate", "contactId");

-- CreateIndex
CREATE INDEX "FilmCatalogEntry_usedAt_idx" ON "FilmCatalogEntry"("usedAt");

-- AddForeignKey
ALTER TABLE "NewsPreferences" ADD CONSTRAINT "NewsPreferences_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NewsPreferences" ADD CONSTRAINT "NewsPreferences_productSubscriptionId_fkey" FOREIGN KEY ("productSubscriptionId") REFERENCES "ProductSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsDailySend" ADD CONSTRAINT "NewsDailySend_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NewsDailySend" ADD CONSTRAINT "NewsDailySend_productSubscriptionId_fkey" FOREIGN KEY ("productSubscriptionId") REFERENCES "ProductSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NewsDailySend" ADD CONSTRAINT "NewsDailySend_newsDailyIssueId_fkey" FOREIGN KEY ("newsDailyIssueId") REFERENCES "NewsDailyIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilmPreferences" ADD CONSTRAINT "FilmPreferences_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FilmPreferences" ADD CONSTRAINT "FilmPreferences_productSubscriptionId_fkey" FOREIGN KEY ("productSubscriptionId") REFERENCES "ProductSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilmDailySend" ADD CONSTRAINT "FilmDailySend_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FilmDailySend" ADD CONSTRAINT "FilmDailySend_productSubscriptionId_fkey" FOREIGN KEY ("productSubscriptionId") REFERENCES "ProductSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FilmDailySend" ADD CONSTRAINT "FilmDailySend_filmDailyIssueId_fkey" FOREIGN KEY ("filmDailyIssueId") REFERENCES "FilmDailyIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
