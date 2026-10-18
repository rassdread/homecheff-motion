-- Additive HomeCheff voice catalog. Does not change character voice profiles.

CREATE TABLE "StudioVoiceCatalogEntry" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'elevenlabs',
    "providerVoiceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "canonicalLanguage" TEXT NOT NULL DEFAULT '',
    "originalLanguage" TEXT NOT NULL DEFAULT '',
    "locale" TEXT NOT NULL DEFAULT '',
    "accent" TEXT NOT NULL DEFAULT '',
    "accentId" TEXT NOT NULL DEFAULT '',
    "gender" TEXT NOT NULL DEFAULT '',
    "age" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "descriptive" TEXT NOT NULL DEFAULT '',
    "useCase" TEXT NOT NULL DEFAULT '',
    "labelsJson" JSONB,
    "previewUrl" TEXT NOT NULL DEFAULT '',
    "catalogSource" TEXT NOT NULL DEFAULT '',
    "eligibilityStatus" TEXT NOT NULL,
    "availabilityStatus" TEXT NOT NULL,
    "modelCompatibility" TEXT NOT NULL DEFAULT '',
    "sampleStatus" TEXT NOT NULL DEFAULT 'present',
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastCheckedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioVoiceCatalogEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudioVoiceCatalogSyncRun" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "pagesFetched" INTEGER NOT NULL DEFAULT 0,
    "upserted" INTEGER NOT NULL DEFAULT 0,
    "providerRequests" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT NOT NULL DEFAULT '',
    "cursor" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "StudioVoiceCatalogSyncRun_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StudioVoiceCatalogEntry_provider_providerVoiceId_key" ON "StudioVoiceCatalogEntry"("provider", "providerVoiceId");
CREATE INDEX "StudioVoiceCatalogEntry_eligibilityStatus_canonicalLanguage_name_idx" ON "StudioVoiceCatalogEntry"("eligibilityStatus", "canonicalLanguage", "name");
CREATE INDEX "StudioVoiceCatalogEntry_eligibilityStatus_accentId_idx" ON "StudioVoiceCatalogEntry"("eligibilityStatus", "accentId");
CREATE INDEX "StudioVoiceCatalogEntry_eligibilityStatus_gender_idx" ON "StudioVoiceCatalogEntry"("eligibilityStatus", "gender");
CREATE INDEX "StudioVoiceCatalogEntry_eligibilityStatus_age_idx" ON "StudioVoiceCatalogEntry"("eligibilityStatus", "age");
CREATE INDEX "StudioVoiceCatalogEntry_eligibilityStatus_category_idx" ON "StudioVoiceCatalogEntry"("eligibilityStatus", "category");
CREATE INDEX "StudioVoiceCatalogSyncRun_status_startedAt_idx" ON "StudioVoiceCatalogSyncRun"("status", "startedAt");
