-- Panel-editable runtime configuration. Additive: env vars remain the fallback
-- default when a key has no row, so an empty table = original env-only behaviour.
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);
