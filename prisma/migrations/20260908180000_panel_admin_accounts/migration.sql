-- Panel-managed administrator accounts.
--
-- Additive and widening only: `passwordHash` becomes nullable so an invited
-- administrator can exist before choosing a password, and three nullable
-- columns carry the invitation. Existing rows are untouched and keep working
-- as password overrides for deployment-configured admins.

ALTER TABLE "AdminCredential" ALTER COLUMN "passwordHash" DROP NOT NULL;
ALTER TABLE "AdminCredential" ADD COLUMN "createdBy" TEXT;
ALTER TABLE "AdminCredential" ADD COLUMN "inviteTokenHash" TEXT;
ALTER TABLE "AdminCredential" ADD COLUMN "inviteExpiresAt" TIMESTAMP(3);

CREATE INDEX "AdminCredential_inviteTokenHash_idx" ON "AdminCredential"("inviteTokenHash");
