-- DropForeignKey
ALTER TABLE "NewsDailySend" DROP CONSTRAINT "NewsDailySend_contactId_fkey";

-- DropForeignKey
ALTER TABLE "NewsDailySend" DROP CONSTRAINT "NewsDailySend_newsDailyIssueId_fkey";

-- DropForeignKey
ALTER TABLE "NewsDailySend" DROP CONSTRAINT "NewsDailySend_productSubscriptionId_fkey";

-- DropForeignKey
ALTER TABLE "NewsPreferences" DROP CONSTRAINT "NewsPreferences_contactId_fkey";

-- DropForeignKey
ALTER TABLE "NewsPreferences" DROP CONSTRAINT "NewsPreferences_productSubscriptionId_fkey";

-- DropTable
DROP TABLE "NewsDailyIssue";

-- DropTable
DROP TABLE "NewsDailySend";

-- DropTable
DROP TABLE "NewsPreferences";

-- DropTable
DROP TABLE "NewsSourceStory";

