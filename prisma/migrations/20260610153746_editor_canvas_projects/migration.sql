-- CreateTable
CREATE TABLE "EditorCanvasProject" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "payload" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "EditorCanvasProject_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EditorCanvasProject_ownerId_status_updatedAt_idx" ON "EditorCanvasProject"("ownerId", "status", "updatedAt");

-- AddForeignKey
ALTER TABLE "EditorCanvasProject" ADD CONSTRAINT "EditorCanvasProject_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
