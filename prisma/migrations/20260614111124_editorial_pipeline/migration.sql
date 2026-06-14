-- AlterTable
ALTER TABLE "Subscriber" ADD COLUMN     "deliveryHour" INTEGER NOT NULL DEFAULT 7,
ADD COLUMN     "feedbackProfile" JSONB,
ADD COLUMN     "lastSentAt" TIMESTAMP(3),
ADD COLUMN     "preferredDifficulty" TEXT NOT NULL DEFAULT 'mixed',
ADD COLUMN     "primaryInterest" TEXT,
ADD COLUMN     "recentlySentArticleIds" TEXT[],
ADD COLUMN     "recentlySentTopics" TEXT[],
ADD COLUMN     "secondaryInterests" TEXT[],
ADD COLUMN     "timezone" TEXT DEFAULT 'Europe/Istanbul';

-- CreateTable
CREATE TABLE "Article" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "sourceLanguage" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "subtopics" TEXT[],
    "tags" TEXT[],
    "publishedAt" TIMESTAMP(3),
    "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "qualityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "usefulnessScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "morningReadScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "difficulty" TEXT NOT NULL DEFAULT 'mixed',
    "rawExcerpt" TEXT,
    "reasonForSelection" TEXT,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TopicDailyPick" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "topic" TEXT NOT NULL,
    "subtopics" TEXT[],
    "sourceLanguage" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "articleTitle" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "reasonForSelection" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TopicDailyPick_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Summary" (
    "id" TEXT NOT NULL,
    "topicDailyPickId" TEXT NOT NULL,
    "summaryLanguage" TEXT NOT NULL,
    "primaryTopic" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL DEFAULT 'mixed',
    "bodyText" TEXT NOT NULL,
    "bodyHtml" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Summary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailySend" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "subscriberId" TEXT NOT NULL,
    "topicDailyPickId" TEXT NOT NULL,
    "summaryLanguage" TEXT NOT NULL,
    "matchedTopic" TEXT NOT NULL,
    "personalizedScore" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "emailMessageId" TEXT,
    "error" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailySend_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "subscriberId" TEXT NOT NULL,
    "articleId" TEXT,
    "topic" TEXT,
    "sourceName" TEXT,
    "reaction" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Article_url_key" ON "Article"("url");

-- CreateIndex
CREATE INDEX "Article_topic_sourceLanguage_idx" ON "Article"("topic", "sourceLanguage");

-- CreateIndex
CREATE INDEX "Article_ingestedAt_idx" ON "Article"("ingestedAt");

-- CreateIndex
CREATE INDEX "TopicDailyPick_date_status_idx" ON "TopicDailyPick"("date", "status");

-- CreateIndex
CREATE UNIQUE INDEX "TopicDailyPick_date_topic_sourceLanguage_key" ON "TopicDailyPick"("date", "topic", "sourceLanguage");

-- CreateIndex
CREATE UNIQUE INDEX "Summary_topicDailyPickId_summaryLanguage_primaryTopic_diffi_key" ON "Summary"("topicDailyPickId", "summaryLanguage", "primaryTopic", "difficulty");

-- CreateIndex
CREATE INDEX "DailySend_date_status_idx" ON "DailySend"("date", "status");

-- CreateIndex
CREATE UNIQUE INDEX "DailySend_date_subscriberId_key" ON "DailySend"("date", "subscriberId");

-- CreateIndex
CREATE INDEX "Feedback_subscriberId_createdAt_idx" ON "Feedback"("subscriberId", "createdAt");

-- CreateIndex
CREATE INDEX "Subscriber_summaryLanguage_status_idx" ON "Subscriber"("summaryLanguage", "status");

-- AddForeignKey
ALTER TABLE "TopicDailyPick" ADD CONSTRAINT "TopicDailyPick_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Summary" ADD CONSTRAINT "Summary_topicDailyPickId_fkey" FOREIGN KEY ("topicDailyPickId") REFERENCES "TopicDailyPick"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailySend" ADD CONSTRAINT "DailySend_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "Subscriber"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailySend" ADD CONSTRAINT "DailySend_topicDailyPickId_fkey" FOREIGN KEY ("topicDailyPickId") REFERENCES "TopicDailyPick"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "Subscriber"("id") ON DELETE CASCADE ON UPDATE CASCADE;
