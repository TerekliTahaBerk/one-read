-- CreateTable
CREATE TABLE "LingoPreferences" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "productSubscriptionId" TEXT NOT NULL,
    "targetLanguage" TEXT NOT NULL,
    "nativeLanguage" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "learningGoal" TEXT NOT NULL,
    "practiceStyle" TEXT NOT NULL,
    "interests" TEXT[],
    "minutesPerDay" INTEGER NOT NULL DEFAULT 5,
    "wantsVocabulary" BOOLEAN NOT NULL DEFAULT true,
    "wantsPhrases" BOOLEAN NOT NULL DEFAULT true,
    "wantsGrammar" BOOLEAN NOT NULL DEFAULT true,
    "wantsMiniQuiz" BOOLEAN NOT NULL DEFAULT true,
    "wantsCultureNote" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LingoPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LingoDailyLesson" (
    "id" TEXT NOT NULL,
    "lessonDate" DATE NOT NULL,
    "targetLanguage" TEXT NOT NULL,
    "nativeLanguage" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "segmentKey" TEXT NOT NULL,
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

    CONSTRAINT "LingoDailyLesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LingoDailySend" (
    "id" TEXT NOT NULL,
    "lessonDate" DATE NOT NULL,
    "contactId" TEXT NOT NULL,
    "productSubscriptionId" TEXT NOT NULL,
    "lingoDailyLessonId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "skippedReason" TEXT,
    "failedReason" TEXT,
    "providerMessageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LingoDailySend_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LingoPreferences_productSubscriptionId_key" ON "LingoPreferences"("productSubscriptionId");

-- CreateIndex
CREATE INDEX "LingoPreferences_contactId_idx" ON "LingoPreferences"("contactId");

-- CreateIndex
CREATE INDEX "LingoPreferences_targetLanguage_idx" ON "LingoPreferences"("targetLanguage");

-- CreateIndex
CREATE INDEX "LingoPreferences_level_idx" ON "LingoPreferences"("level");

-- CreateIndex
CREATE INDEX "LingoDailyLesson_lessonDate_idx" ON "LingoDailyLesson"("lessonDate");

-- CreateIndex
CREATE INDEX "LingoDailyLesson_targetLanguage_nativeLanguage_level_idx" ON "LingoDailyLesson"("targetLanguage", "nativeLanguage", "level");

-- CreateIndex
CREATE INDEX "LingoDailyLesson_approvalStatus_idx" ON "LingoDailyLesson"("approvalStatus");

-- CreateIndex
CREATE UNIQUE INDEX "LingoDailyLesson_lessonDate_segmentKey_key" ON "LingoDailyLesson"("lessonDate", "segmentKey");

-- CreateIndex
CREATE INDEX "LingoDailySend_lingoDailyLessonId_idx" ON "LingoDailySend"("lingoDailyLessonId");

-- CreateIndex
CREATE INDEX "LingoDailySend_status_idx" ON "LingoDailySend"("status");

-- CreateIndex
CREATE UNIQUE INDEX "LingoDailySend_lessonDate_contactId_key" ON "LingoDailySend"("lessonDate", "contactId");

-- AddForeignKey
ALTER TABLE "LingoPreferences" ADD CONSTRAINT "LingoPreferences_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LingoPreferences" ADD CONSTRAINT "LingoPreferences_productSubscriptionId_fkey" FOREIGN KEY ("productSubscriptionId") REFERENCES "ProductSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LingoDailySend" ADD CONSTRAINT "LingoDailySend_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LingoDailySend" ADD CONSTRAINT "LingoDailySend_productSubscriptionId_fkey" FOREIGN KEY ("productSubscriptionId") REFERENCES "ProductSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LingoDailySend" ADD CONSTRAINT "LingoDailySend_lingoDailyLessonId_fkey" FOREIGN KEY ("lingoDailyLessonId") REFERENCES "LingoDailyLesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
