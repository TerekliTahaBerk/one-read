-- Resumable checkout sessions.
--
-- A repeated checkout request for the same offer should return the customer to
-- the session they already have open rather than mint a second one, so the
-- stored session needs its hosted URL and an expiry alongside its id.
ALTER TABLE "ProductSubscription" ADD COLUMN "providerCheckoutUrl" TEXT;
ALTER TABLE "ProductSubscription" ADD COLUMN "providerCheckoutExpiresAt" TIMESTAMP(3);
