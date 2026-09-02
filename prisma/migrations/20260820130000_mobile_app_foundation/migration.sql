-- OneRead iOS foundation. All changes are additive; existing email fields and
-- delivery behavior are unchanged.
ALTER TABLE "OneArticleIssue" ADD COLUMN "nativeContent" JSONB;

CREATE TABLE "MobileSession" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "selector" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "deviceLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    CONSTRAINT "MobileSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PushDevice" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "providerToken" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "timezone" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    CONSTRAINT "PushDevice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReadingState" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ReadingState_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MobileSession_selector_key" ON "MobileSession"("selector");
CREATE INDEX "MobileSession_contactId_revokedAt_idx" ON "MobileSession"("contactId", "revokedAt");
CREATE INDEX "MobileSession_expiresAt_idx" ON "MobileSession"("expiresAt");
CREATE UNIQUE INDEX "PushDevice_tokenHash_key" ON "PushDevice"("tokenHash");
CREATE INDEX "PushDevice_contactId_enabled_idx" ON "PushDevice"("contactId", "enabled");
CREATE UNIQUE INDEX "ReadingState_contactId_issueId_key" ON "ReadingState"("contactId", "issueId");
CREATE INDEX "ReadingState_contactId_updatedAt_idx" ON "ReadingState"("contactId", "updatedAt");

ALTER TABLE "MobileSession" ADD CONSTRAINT "MobileSession_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PushDevice" ADD CONSTRAINT "PushDevice_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReadingState" ADD CONSTRAINT "ReadingState_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReadingState" ADD CONSTRAINT "ReadingState_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "OneArticleIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
