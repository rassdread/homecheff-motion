-- AlterTable
ALTER TABLE "AnimationProject" ADD COLUMN "sourceProjectId" TEXT;

-- CreateIndex
CREATE INDEX "AnimationProject_sourceProjectId_idx" ON "AnimationProject"("sourceProjectId");

-- AddForeignKey
ALTER TABLE "AnimationProject" ADD CONSTRAINT "AnimationProject_sourceProjectId_fkey" FOREIGN KEY ("sourceProjectId") REFERENCES "AnimationProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
