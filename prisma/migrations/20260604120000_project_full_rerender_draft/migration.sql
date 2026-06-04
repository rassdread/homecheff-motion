-- CreateTable
CREATE TABLE "ProjectFullRerenderDraft" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectFullRerenderDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectFullRerenderDraft_projectId_key" ON "ProjectFullRerenderDraft"("projectId");

-- CreateIndex
CREATE INDEX "ProjectFullRerenderDraft_updatedAt_idx" ON "ProjectFullRerenderDraft"("updatedAt");

-- AddForeignKey
ALTER TABLE "ProjectFullRerenderDraft" ADD CONSTRAINT "ProjectFullRerenderDraft_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "AnimationProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
