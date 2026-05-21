-- CreateTable
CREATE TABLE "VideoLanguageExport" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "languageCode" TEXT NOT NULL,
    "languageLabel" TEXT NOT NULL,
    "outputVideoUrl" TEXT,
    "status" TEXT NOT NULL,
    "sourceFinalVideoUrl" TEXT NOT NULL,
    "textLayerJson" JSONB NOT NULL,
    "translationProvider" TEXT,
    "translationAuditJson" JSONB,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoLanguageExport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VideoLanguageExport_projectId_createdAt_idx" ON "VideoLanguageExport"("projectId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "VideoLanguageExport_projectId_languageCode_version_key" ON "VideoLanguageExport"("projectId", "languageCode", "version");

-- AddForeignKey
ALTER TABLE "VideoLanguageExport" ADD CONSTRAINT "VideoLanguageExport_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "AnimationProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
