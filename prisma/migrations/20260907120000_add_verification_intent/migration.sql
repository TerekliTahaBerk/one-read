-- PII-free commercial attribution for the launch funnel. Existing rows remain
-- unclassified rather than being guessed into a current offer.
ALTER TABLE "EmailVerificationCode" ADD COLUMN "intent" TEXT;
