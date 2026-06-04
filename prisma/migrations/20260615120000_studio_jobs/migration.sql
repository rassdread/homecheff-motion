-- CreateTable
CREATE TABLE "StudioJob" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "storyboardId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "currentStep" TEXT NOT NULL DEFAULT '',
    "totalSteps" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "errorMessage" TEXT NOT NULL DEFAULT '',
    "inputJson" JSONB NOT NULL,
    "resultJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudioJob_ownerId_idx" ON "StudioJob"("ownerId");

-- CreateIndex
CREATE INDEX "StudioJob_storyboardId_idx" ON "StudioJob"("storyboardId");

-- CreateIndex
CREATE INDEX "StudioJob_status_idx" ON "StudioJob"("status");

-- CreateIndex
CREATE INDEX "StudioJob_createdAt_idx" ON "StudioJob"("createdAt");

-- CreateIndex
CREATE INDEX "StudioJob_storyboardId_status_idx" ON "StudioJob"("storyboardId", "status");

-- AddForeignKey
ALTER TABLE "StudioJob" ADD CONSTRAINT "StudioJob_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioJob" ADD CONSTRAINT "StudioJob_storyboardId_fkey" FOREIGN KEY ("storyboardId") REFERENCES "StudioStoryboard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
