-- CreateTable
CREATE TABLE "StudioProp" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL,
    "referenceImageUrl" TEXT NOT NULL,
    "referenceStorageKey" TEXT NOT NULL,
    "isSystemProp" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioProp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudioProp_ownerId_createdAt_idx" ON "StudioProp"("ownerId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "StudioProp_ownerId_slug_key" ON "StudioProp"("ownerId", "slug");

-- AddForeignKey
ALTER TABLE "StudioProp" ADD CONSTRAINT "StudioProp_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
