-- One Read — paid subscription support.
--
-- Additive only: two new nullable columns on Subscriber that track paid
-- (simulated) subscription state. No columns are dropped or retyped, so
-- existing Subscriber data is preserved.
--
-- A subscriber counts as "subscribed" when `subscribedAt` is non-null and
-- `status` is not "UNSUBSCRIBED".
--
-- Note: dev environments that received these changes via `prisma db push`
-- should mark this migration as already applied:
--     npx prisma migrate resolve --applied 20260615000000_subscription_billing
-- Fresh databases pick it up normally through `prisma migrate deploy`.

-- AlterTable
ALTER TABLE "Subscriber" ADD COLUMN IF NOT EXISTS "subscribedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "billingInterval" TEXT;
