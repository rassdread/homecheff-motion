-- CreateTable
CREATE TABLE "StudioLocation" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL,
    "referenceImageUrl" TEXT NOT NULL,
    "referenceStorageKey" TEXT NOT NULL,
    "isSystemLocation" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioLocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudioLocation_ownerId_createdAt_idx" ON "StudioLocation"("ownerId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "StudioLocation_ownerId_slug_key" ON "StudioLocation"("ownerId", "slug");

-- AddForeignKey
ALTER TABLE "StudioLocation" ADD CONSTRAINT "StudioLocation_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
