-- AlterTable
ALTER TABLE "StudioScene" ADD COLUMN "selectedSceneImageId" TEXT;

-- CreateTable
CREATE TABLE "StudioSceneImage" (
    "id" TEXT NOT NULL,
    "sceneId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "promptVersion" INTEGER NOT NULL,
    "generationVersion" INTEGER NOT NULL DEFAULT 1,
    "generatedPrompt" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL DEFAULT '',
    "storageKey" TEXT NOT NULL DEFAULT '',
    "thumbnailUrl" TEXT NOT NULL DEFAULT '',
    "provider" TEXT NOT NULL,
    "seed" TEXT,
    "generationSettings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioSceneImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudioSceneImage_sceneId_createdAt_idx" ON "StudioSceneImage"("sceneId", "createdAt");

-- AddForeignKey
ALTER TABLE "StudioScene" ADD CONSTRAINT "StudioScene_selectedSceneImageId_fkey" FOREIGN KEY ("selectedSceneImageId") REFERENCES "StudioSceneImage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioSceneImage" ADD CONSTRAINT "StudioSceneImage_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "StudioScene"("id") ON DELETE CASCADE ON UPDATE CASCADE;
