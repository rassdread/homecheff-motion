-- CreateTable
CREATE TABLE "ProjectRenderVersion" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "renderVersionNumber" INTEGER NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'initial',
    "status" TEXT NOT NULL DEFAULT 'queued',
    "sourceImageSetId" TEXT NOT NULL,
    "createdFromRenderId" TEXT,
    "versionNote" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "promptSnapshot" JSONB NOT NULL,
    "storyboardSnapshot" JSONB NOT NULL,
    "settingsSnapshot" JSONB NOT NULL,
    "segmentSnapshot" JSONB,
    "finalVideoUrl" TEXT,
    "cleanVideoUrl" TEXT,
    "exportId" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectRenderVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectRenderVersion_projectId_renderVersionNumber_key" ON "ProjectRenderVersion"("projectId", "renderVersionNumber");

-- CreateIndex
CREATE INDEX "ProjectRenderVersion_projectId_createdAt_idx" ON "ProjectRenderVersion"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "ProjectRenderVersion_projectId_isDefault_idx" ON "ProjectRenderVersion"("projectId", "isDefault");

-- AddForeignKey
ALTER TABLE "ProjectRenderVersion" ADD CONSTRAINT "ProjectRenderVersion_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "AnimationProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
