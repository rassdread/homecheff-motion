-- CreateTable
CREATE TABLE "HomeCheffProject" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "packageVersion" INTEGER NOT NULL DEFAULT 1,
    "manifestJson" JSONB NOT NULL,
    "servicePayloadJson" JSONB NOT NULL DEFAULT '{}',
    "currentService" TEXT,
    "sourceService" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomeCheffProject_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProjectHandoff" (
    "id" TEXT NOT NULL,
    "sourceProjectId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetProjectId" TEXT,
    "handoffType" TEXT NOT NULL,
    "payloadJson" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectHandoff_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProjectAssetReference" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "storageKey" TEXT,
    "kind" TEXT NOT NULL,
    "role" TEXT,
    "permissionsJson" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectAssetReference_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "HomeCheffProject_ownerId_updatedAt_idx" ON "HomeCheffProject"("ownerId", "updatedAt");
CREATE INDEX "ProjectHandoff_sourceProjectId_idx" ON "ProjectHandoff"("sourceProjectId");
CREATE INDEX "ProjectAssetReference_packageId_idx" ON "ProjectAssetReference"("packageId");
CREATE INDEX "ProjectAssetReference_packageId_assetId_idx" ON "ProjectAssetReference"("packageId", "assetId");

ALTER TABLE "HomeCheffProject" ADD CONSTRAINT "HomeCheffProject_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectHandoff" ADD CONSTRAINT "ProjectHandoff_sourceProjectId_fkey" FOREIGN KEY ("sourceProjectId") REFERENCES "HomeCheffProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectAssetReference" ADD CONSTRAINT "ProjectAssetReference_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "HomeCheffProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
