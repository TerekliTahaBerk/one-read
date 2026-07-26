CREATE TABLE "AdminLoginThrottle" (
    "key" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "windowStarted" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "blockedUntil" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminLoginThrottle_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "AdminLoginThrottle_blockedUntil_idx"
ON "AdminLoginThrottle"("blockedUntil");

CREATE INDEX "AdminLoginThrottle_updatedAt_idx"
ON "AdminLoginThrottle"("updatedAt");
