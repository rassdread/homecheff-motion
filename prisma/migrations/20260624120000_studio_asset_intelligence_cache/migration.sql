-- CreateTable
CREATE TABLE "StudioAssetIntelligenceCache" (
    "id" TEXT NOT NULL,
    "imageHash" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "assetId" TEXT,
    "sourceKind" TEXT NOT NULL,
    "profileJson" JSONB NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'openai',
    "providerCostUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ownerUserId" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'private',
    "usageCount" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudioAssetIntelligenceCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StudioAssetIntelligenceCache_imageHash_modelVersion_promptVersion_key" ON "StudioAssetIntelligenceCache"("imageHash", "modelVersion", "promptVersion");

-- CreateIndex
CREATE INDEX "StudioAssetIntelligenceCache_ownerUserId_idx" ON "StudioAssetIntelligenceCache"("ownerUserId");

-- CreateIndex
CREATE INDEX "StudioAssetIntelligenceCache_assetId_idx" ON "StudioAssetIntelligenceCache"("assetId");

-- CreateIndex
CREATE INDEX "StudioAssetIntelligenceCache_lastUsedAt_idx" ON "StudioAssetIntelligenceCache"("lastUsedAt");
