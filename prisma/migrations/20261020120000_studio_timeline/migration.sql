-- Additive film timeline. Existing scenes, assets, and subtitle rows stay in place.
-- No backfill. No media deletion.

-- CreateTable
CREATE TABLE "StudioTimeline" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "simpleMode" BOOLEAN NOT NULL DEFAULT true,
    "previewLanguage" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioTimeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudioTimelineTrack" (
    "id" TEXT NOT NULL,
    "timelineId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "muted" BOOLEAN NOT NULL DEFAULT false,
    "volume" INTEGER NOT NULL DEFAULT 100,
    "language" TEXT NOT NULL DEFAULT '',
    "subtitleStatus" TEXT NOT NULL DEFAULT 'draft',
    "previewEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioTimelineTrack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudioTimelineClip" (
    "id" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "startMs" INTEGER NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "inMs" INTEGER NOT NULL DEFAULT 0,
    "outMs" INTEGER,
    "sourceKind" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL DEFAULT '',
    "text" TEXT NOT NULL DEFAULT '',
    "volume" INTEGER NOT NULL DEFAULT 100,
    "muted" BOOLEAN NOT NULL DEFAULT false,
    "clientRequestId" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioTimelineClip_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StudioTimeline_projectId_key" ON "StudioTimeline"("projectId");

-- CreateIndex
CREATE INDEX "StudioTimelineTrack_timelineId_sortOrder_idx" ON "StudioTimelineTrack"("timelineId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "StudioTimelineTrack_timelineId_type_language_key" ON "StudioTimelineTrack"("timelineId", "type", "language");

-- CreateIndex
CREATE UNIQUE INDEX "StudioTimelineTrack_timelineId_sortOrder_key" ON "StudioTimelineTrack"("timelineId", "sortOrder");

-- CreateIndex
CREATE INDEX "StudioTimelineClip_trackId_startMs_idx" ON "StudioTimelineClip"("trackId", "startMs");

-- CreateIndex
CREATE INDEX "StudioTimelineClip_trackId_clientRequestId_idx" ON "StudioTimelineClip"("trackId", "clientRequestId");

-- One create request cannot insert two clips on the same track.
CREATE UNIQUE INDEX "StudioTimelineClip_track_request_key" ON "StudioTimelineClip"("trackId", "clientRequestId") WHERE "clientRequestId" <> '';

-- AddForeignKey
ALTER TABLE "StudioTimeline" ADD CONSTRAINT "StudioTimeline_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "StudioCreativeProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioTimelineTrack" ADD CONSTRAINT "StudioTimelineTrack_timelineId_fkey" FOREIGN KEY ("timelineId") REFERENCES "StudioTimeline"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioTimelineClip" ADD CONSTRAINT "StudioTimelineClip_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "StudioTimelineTrack"("id") ON DELETE CASCADE ON UPDATE CASCADE;
