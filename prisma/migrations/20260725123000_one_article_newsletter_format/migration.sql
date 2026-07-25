-- Aposto-inspired, single-article OneArticle email format.
-- Image metadata is optional for existing rows; readiness validation requires
-- it for newly prepared editions.
ALTER TABLE "OneArticleIssue"
  ADD COLUMN "heroImageUrl" TEXT,
  ADD COLUMN "heroImageAlt" TEXT,
  ADD COLUMN "heroImageCredit" TEXT;
