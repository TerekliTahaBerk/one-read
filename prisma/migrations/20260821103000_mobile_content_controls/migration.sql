-- Make the editorial panel the source of truth for native app publication.
-- Defaults keep existing published editions visible and narrated by TTS.
ALTER TABLE "OneArticleIssue"
ADD COLUMN "mobileEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "mobileExploreEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "mobileListenEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "mobileTopics" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "mobilePriority" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "mobileDeck" TEXT,
ADD COLUMN "mobileAudioUrl" TEXT,
ADD COLUMN "mobileAudioDurationSeconds" INTEGER;

CREATE INDEX "OneArticleIssue_mobileEnabled_mobileExploreEnabled_mobilePriority_idx"
ON "OneArticleIssue"("mobileEnabled", "mobileExploreEnabled", "mobilePriority");
