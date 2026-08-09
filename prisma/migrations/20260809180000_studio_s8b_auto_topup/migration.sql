-- S.8B Auto Top-Up prefs on StudioAccount
ALTER TABLE "StudioAccount" ADD COLUMN IF NOT EXISTS "autoTopUpEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "StudioAccount" ADD COLUMN IF NOT EXISTS "autoTopUpThresholdCredits" INTEGER NOT NULL DEFAULT 50;
ALTER TABLE "StudioAccount" ADD COLUMN IF NOT EXISTS "autoTopUpPackSlug" TEXT NOT NULL DEFAULT 'pack_500';
ALTER TABLE "StudioAccount" ADD COLUMN IF NOT EXISTS "autoTopUpConsentAt" TIMESTAMP(3);
ALTER TABLE "StudioAccount" ADD COLUMN IF NOT EXISTS "autoTopUpStatus" TEXT NOT NULL DEFAULT 'disabled';
ALTER TABLE "StudioAccount" ADD COLUMN IF NOT EXISTS "autoTopUpLastAttemptAt" TIMESTAMP(3);
ALTER TABLE "StudioAccount" ADD COLUMN IF NOT EXISTS "autoTopUpLastSuccessAt" TIMESTAMP(3);
ALTER TABLE "StudioAccount" ADD COLUMN IF NOT EXISTS "autoTopUpFailureCount" INTEGER NOT NULL DEFAULT 0;

-- Idempotent Auto Top-Up attempts
CREATE TABLE IF NOT EXISTS "StudioAutoTopUpAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "packSlug" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "stripePaymentIntentId" TEXT,
    "stripeCheckoutSessionId" TEXT,
    "creditsGranted" INTEGER NOT NULL DEFAULT 0,
    "ledgerEntryId" TEXT,
    "failureCode" TEXT,
    "financialCorrelationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StudioAutoTopUpAttempt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "StudioAutoTopUpAttempt_userId_idempotencyKey_key" ON "StudioAutoTopUpAttempt"("userId", "idempotencyKey");
CREATE INDEX IF NOT EXISTS "StudioAutoTopUpAttempt_userId_createdAt_idx" ON "StudioAutoTopUpAttempt"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "StudioAutoTopUpAttempt_stripePaymentIntentId_idx" ON "StudioAutoTopUpAttempt"("stripePaymentIntentId");
CREATE INDEX IF NOT EXISTS "StudioAutoTopUpAttempt_stripeCheckoutSessionId_idx" ON "StudioAutoTopUpAttempt"("stripeCheckoutSessionId");

DO $$ BEGIN
  ALTER TABLE "StudioAutoTopUpAttempt" ADD CONSTRAINT "StudioAutoTopUpAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
