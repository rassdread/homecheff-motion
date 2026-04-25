-- CreateTable
CREATE TABLE "AnimationProject" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "status" TEXT NOT NULL,
    "stylePreset" TEXT,
    "aspectRatio" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnimationProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnimationImage" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "storageKey" TEXT,
    "previewUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnimationImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnimationTransition" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "startImageId" TEXT NOT NULL,
    "endImageId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "provider" TEXT,
    "providerJobId" TEXT,
    "outputVideoUrl" TEXT,
    "errorMessage" TEXT,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnimationTransition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnimationExport" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "outputVideoUrl" TEXT,
    "errorMessage" TEXT,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnimationExport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnimationImage_projectId_order_idx" ON "AnimationImage"("projectId", "order");

-- CreateIndex
CREATE INDEX "AnimationTransition_projectId_order_idx" ON "AnimationTransition"("projectId", "order");

-- CreateIndex
CREATE INDEX "AnimationTransition_projectId_status_idx" ON "AnimationTransition"("projectId", "status");

-- CreateIndex
CREATE INDEX "AnimationExport_projectId_status_idx" ON "AnimationExport"("projectId", "status");

-- AddForeignKey
ALTER TABLE "AnimationImage" ADD CONSTRAINT "AnimationImage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "AnimationProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnimationTransition" ADD CONSTRAINT "AnimationTransition_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "AnimationProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnimationExport" ADD CONSTRAINT "AnimationExport_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "AnimationProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
