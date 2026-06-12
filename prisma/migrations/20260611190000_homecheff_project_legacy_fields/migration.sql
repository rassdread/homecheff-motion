-- AlterTable
ALTER TABLE "HomeCheffProject" ADD COLUMN     "projectFormat" TEXT NOT NULL DEFAULT 'hc',
ADD COLUMN     "projectVersionLabel" TEXT NOT NULL DEFAULT '1',
ADD COLUMN     "legacySourceJson" JSONB,
ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "conversionHistoryJson" JSONB NOT NULL DEFAULT '[]';

-- CreateIndex
CREATE INDEX "HomeCheffProject_ownerId_projectFormat_isArchived_idx" ON "HomeCheffProject"("ownerId", "projectFormat", "isArchived");
