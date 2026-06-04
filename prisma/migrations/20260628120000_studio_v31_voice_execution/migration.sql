-- Studio V31: voice generation assets + subtitle tracks
CREATE TABLE "StudioStoryboardVoice" (
    "id" TEXT NOT NULL,
    "storyboardId" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "voiceProfile" TEXT NOT NULL,
    "voiceStyle" TEXT NOT NULL DEFAULT '',
    "audioUrl" TEXT NOT NULL DEFAULT '',
    "storageKey" TEXT NOT NULL DEFAULT '',
    "durationSeconds" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "providerVoiceId" TEXT NOT NULL DEFAULT '',
    "providerModelId" TEXT NOT NULL DEFAULT '',
    "providerMetadata" JSONB,
    "errorMessage" TEXT NOT NULL DEFAULT '',
    "generatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioStoryboardVoice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudioStoryboardSubtitleTrack" (
    "id" TEXT NOT NULL,
    "storyboardId" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "entriesJson" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioStoryboardSubtitleTrack_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StudioStoryboardVoice_storyboardId_language_key" ON "StudioStoryboardVoice"("storyboardId", "language");
CREATE INDEX "StudioStoryboardVoice_storyboardId_idx" ON "StudioStoryboardVoice"("storyboardId");

CREATE UNIQUE INDEX "StudioStoryboardSubtitleTrack_storyboardId_language_key" ON "StudioStoryboardSubtitleTrack"("storyboardId", "language");
CREATE INDEX "StudioStoryboardSubtitleTrack_storyboardId_idx" ON "StudioStoryboardSubtitleTrack"("storyboardId");

ALTER TABLE "StudioStoryboardVoice" ADD CONSTRAINT "StudioStoryboardVoice_storyboardId_fkey" FOREIGN KEY ("storyboardId") REFERENCES "StudioStoryboard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudioStoryboardSubtitleTrack" ADD CONSTRAINT "StudioStoryboardSubtitleTrack_storyboardId_fkey" FOREIGN KEY ("storyboardId") REFERENCES "StudioStoryboard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
