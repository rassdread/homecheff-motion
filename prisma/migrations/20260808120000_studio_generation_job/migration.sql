-- S.4: Canonical StudioGenerationJob (additive)

CREATE TABLE "StudioGenerationJob" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "storyboardId" TEXT,
    "sceneId" TEXT,
    "capability" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "executionMode" TEXT NOT NULL DEFAULT 'sync',
    "providerAdapter" TEXT NOT NULL DEFAULT '',
    "providerJobId" TEXT,
    "inputHash" TEXT NOT NULL DEFAULT '',
    "idempotencyKey" TEXT NOT NULL,
    "creditCost" INTEGER NOT NULL DEFAULT 0,
    "creditsReserved" INTEGER NOT NULL DEFAULT 0,
    "creditsCharged" INTEGER NOT NULL DEFAULT 0,
    "creditReservationId" TEXT,
    "chargeFinalized" BOOLEAN NOT NULL DEFAULT false,
    "attempt" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 1,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "errorCode" TEXT NOT NULL DEFAULT '',
    "errorMessageSafe" TEXT NOT NULL DEFAULT '',
    "outputAssetId" TEXT,
    "metadataJson" JSONB,
    "inputSnapshotJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioGenerationJob_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StudioGenerationJob_ownerId_idempotencyKey_key" ON "StudioGenerationJob"("ownerId", "idempotencyKey");
CREATE INDEX "StudioGenerationJob_ownerId_createdAt_idx" ON "StudioGenerationJob"("ownerId", "createdAt");
CREATE INDEX "StudioGenerationJob_storyboardId_status_idx" ON "StudioGenerationJob"("storyboardId", "status");
CREATE INDEX "StudioGenerationJob_sceneId_status_idx" ON "StudioGenerationJob"("sceneId", "status");
CREATE INDEX "StudioGenerationJob_status_updatedAt_idx" ON "StudioGenerationJob"("status", "updatedAt");
CREATE INDEX "StudioGenerationJob_providerAdapter_providerJobId_idx" ON "StudioGenerationJob"("providerAdapter", "providerJobId");

ALTER TABLE "StudioGenerationJob" ADD CONSTRAINT "StudioGenerationJob_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
