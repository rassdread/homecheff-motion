-- S.5: Canonical projects, asset library, collections, favorites, brand kits, prompt presets (additive)

CREATE TABLE "StudioCreativeProject" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'active',
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "storyboardId" TEXT,
    "animationProjectId" TEXT,
    "homeCheffProjectId" TEXT,
    "editorCanvasProjectId" TEXT,
    "coverAssetId" TEXT,
    "tagsJson" JSONB,
    "metadataJson" JSONB,
    "lastOpenedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioCreativeProject_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudioLibraryAsset" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "projectId" TEXT,
    "family" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT '',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "tagsJson" JSONB,
    "origin" TEXT NOT NULL DEFAULT 'uploaded',
    "status" TEXT NOT NULL DEFAULT 'active',
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "previewUrl" TEXT NOT NULL DEFAULT '',
    "downloadUrl" TEXT NOT NULL DEFAULT '',
    "storageKey" TEXT NOT NULL DEFAULT '',
    "mimeType" TEXT NOT NULL DEFAULT '',
    "backingStore" TEXT NOT NULL DEFAULT 'blob_manifest',
    "sourceKind" TEXT NOT NULL DEFAULT '',
    "sourceId" TEXT NOT NULL DEFAULT '',
    "parentAssetId" TEXT,
    "generationJobId" TEXT,
    "promptSummary" TEXT NOT NULL DEFAULT '',
    "aiModel" TEXT NOT NULL DEFAULT '',
    "generator" TEXT NOT NULL DEFAULT '',
    "creditsSpent" INTEGER NOT NULL DEFAULT 0,
    "width" INTEGER,
    "height" INTEGER,
    "durationSeconds" DOUBLE PRECISION,
    "language" TEXT NOT NULL DEFAULT '',
    "aspectRatio" TEXT NOT NULL DEFAULT '',
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "metadataJson" JSONB,
    "archivedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioLibraryAsset_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudioLibraryAssetVersion" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "label" TEXT NOT NULL DEFAULT '',
    "previewUrl" TEXT NOT NULL DEFAULT '',
    "downloadUrl" TEXT NOT NULL DEFAULT '',
    "storageKey" TEXT NOT NULL DEFAULT '',
    "promptSummary" TEXT NOT NULL DEFAULT '',
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudioLibraryAssetVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudioAssetCollection" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "projectId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "labelKey" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioAssetCollection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudioAssetCollectionMember" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudioAssetCollectionMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudioFavorite" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "targetKind" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudioFavorite_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudioBrandKit" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "projectId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "kitJson" JSONB NOT NULL,
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'active',
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioBrandKit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudioPromptPreset" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "projectId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "scope" TEXT NOT NULL DEFAULT 'user',
    "presetJson" JSONB NOT NULL,
    "tagsJson" JSONB,
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'active',
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioPromptPreset_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudioAssetRelation" (
    "id" TEXT NOT NULL,
    "fromAssetId" TEXT NOT NULL,
    "toAssetId" TEXT NOT NULL,
    "relationType" TEXT NOT NULL,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudioAssetRelation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudioAssetUsageEvent" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityName" TEXT NOT NULL DEFAULT '',
    "contextJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudioAssetUsageEvent_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "StudioCreativeProject_ownerId_updatedAt_idx" ON "StudioCreativeProject"("ownerId", "updatedAt");
CREATE INDEX "StudioCreativeProject_ownerId_status_idx" ON "StudioCreativeProject"("ownerId", "status");
CREATE INDEX "StudioCreativeProject_ownerId_pinned_idx" ON "StudioCreativeProject"("ownerId", "pinned");
CREATE INDEX "StudioCreativeProject_ownerId_favorite_idx" ON "StudioCreativeProject"("ownerId", "favorite");
CREATE INDEX "StudioCreativeProject_storyboardId_idx" ON "StudioCreativeProject"("storyboardId");
CREATE INDEX "StudioCreativeProject_animationProjectId_idx" ON "StudioCreativeProject"("animationProjectId");
CREATE INDEX "StudioCreativeProject_homeCheffProjectId_idx" ON "StudioCreativeProject"("homeCheffProjectId");

CREATE UNIQUE INDEX "StudioLibraryAsset_ownerId_sourceKind_sourceId_key" ON "StudioLibraryAsset"("ownerId", "sourceKind", "sourceId");
CREATE INDEX "StudioLibraryAsset_ownerId_family_status_idx" ON "StudioLibraryAsset"("ownerId", "family", "status");
CREATE INDEX "StudioLibraryAsset_ownerId_updatedAt_idx" ON "StudioLibraryAsset"("ownerId", "updatedAt");
CREATE INDEX "StudioLibraryAsset_ownerId_favorite_idx" ON "StudioLibraryAsset"("ownerId", "favorite");
CREATE INDEX "StudioLibraryAsset_projectId_status_idx" ON "StudioLibraryAsset"("projectId", "status");
CREATE INDEX "StudioLibraryAsset_parentAssetId_idx" ON "StudioLibraryAsset"("parentAssetId");
CREATE INDEX "StudioLibraryAsset_generationJobId_idx" ON "StudioLibraryAsset"("generationJobId");

CREATE UNIQUE INDEX "StudioLibraryAssetVersion_assetId_versionNumber_key" ON "StudioLibraryAssetVersion"("assetId", "versionNumber");
CREATE INDEX "StudioLibraryAssetVersion_assetId_createdAt_idx" ON "StudioLibraryAssetVersion"("assetId", "createdAt");

CREATE INDEX "StudioAssetCollection_ownerId_updatedAt_idx" ON "StudioAssetCollection"("ownerId", "updatedAt");
CREATE INDEX "StudioAssetCollection_projectId_idx" ON "StudioAssetCollection"("projectId");

CREATE UNIQUE INDEX "StudioAssetCollectionMember_collectionId_assetId_key" ON "StudioAssetCollectionMember"("collectionId", "assetId");
CREATE INDEX "StudioAssetCollectionMember_assetId_idx" ON "StudioAssetCollectionMember"("assetId");

CREATE UNIQUE INDEX "StudioFavorite_ownerId_targetKind_targetId_key" ON "StudioFavorite"("ownerId", "targetKind", "targetId");
CREATE INDEX "StudioFavorite_ownerId_createdAt_idx" ON "StudioFavorite"("ownerId", "createdAt");

CREATE INDEX "StudioBrandKit_ownerId_updatedAt_idx" ON "StudioBrandKit"("ownerId", "updatedAt");
CREATE INDEX "StudioBrandKit_projectId_idx" ON "StudioBrandKit"("projectId");

CREATE INDEX "StudioPromptPreset_ownerId_scope_updatedAt_idx" ON "StudioPromptPreset"("ownerId", "scope", "updatedAt");
CREATE INDEX "StudioPromptPreset_projectId_idx" ON "StudioPromptPreset"("projectId");

CREATE UNIQUE INDEX "StudioAssetRelation_fromAssetId_toAssetId_relationType_key" ON "StudioAssetRelation"("fromAssetId", "toAssetId", "relationType");
CREATE INDEX "StudioAssetRelation_toAssetId_idx" ON "StudioAssetRelation"("toAssetId");
CREATE INDEX "StudioAssetRelation_relationType_idx" ON "StudioAssetRelation"("relationType");

CREATE INDEX "StudioAssetUsageEvent_assetId_createdAt_idx" ON "StudioAssetUsageEvent"("assetId", "createdAt");
CREATE INDEX "StudioAssetUsageEvent_entityType_entityId_idx" ON "StudioAssetUsageEvent"("entityType", "entityId");

-- Foreign keys
ALTER TABLE "StudioCreativeProject" ADD CONSTRAINT "StudioCreativeProject_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StudioLibraryAsset" ADD CONSTRAINT "StudioLibraryAsset_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudioLibraryAsset" ADD CONSTRAINT "StudioLibraryAsset_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "StudioCreativeProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StudioLibraryAsset" ADD CONSTRAINT "StudioLibraryAsset_parentAssetId_fkey" FOREIGN KEY ("parentAssetId") REFERENCES "StudioLibraryAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "StudioLibraryAssetVersion" ADD CONSTRAINT "StudioLibraryAssetVersion_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "StudioLibraryAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StudioAssetCollection" ADD CONSTRAINT "StudioAssetCollection_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudioAssetCollection" ADD CONSTRAINT "StudioAssetCollection_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "StudioCreativeProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "StudioAssetCollectionMember" ADD CONSTRAINT "StudioAssetCollectionMember_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "StudioAssetCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudioAssetCollectionMember" ADD CONSTRAINT "StudioAssetCollectionMember_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "StudioLibraryAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StudioFavorite" ADD CONSTRAINT "StudioFavorite_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StudioBrandKit" ADD CONSTRAINT "StudioBrandKit_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudioBrandKit" ADD CONSTRAINT "StudioBrandKit_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "StudioCreativeProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "StudioPromptPreset" ADD CONSTRAINT "StudioPromptPreset_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudioPromptPreset" ADD CONSTRAINT "StudioPromptPreset_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "StudioCreativeProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "StudioAssetRelation" ADD CONSTRAINT "StudioAssetRelation_fromAssetId_fkey" FOREIGN KEY ("fromAssetId") REFERENCES "StudioLibraryAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudioAssetRelation" ADD CONSTRAINT "StudioAssetRelation_toAssetId_fkey" FOREIGN KEY ("toAssetId") REFERENCES "StudioLibraryAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StudioAssetUsageEvent" ADD CONSTRAINT "StudioAssetUsageEvent_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "StudioLibraryAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
