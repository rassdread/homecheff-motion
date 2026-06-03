-- CreateTable
CREATE TABLE "StudioCharacter" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "personality" TEXT NOT NULL DEFAULT '',
    "referenceImageUrl" TEXT NOT NULL,
    "referenceStorageKey" TEXT NOT NULL,
    "isMascot" BOOLEAN NOT NULL DEFAULT false,
    "isSystemCharacter" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioCharacter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudioCharacter_ownerId_createdAt_idx" ON "StudioCharacter"("ownerId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "StudioCharacter_ownerId_slug_key" ON "StudioCharacter"("ownerId", "slug");

-- AddForeignKey
ALTER TABLE "StudioCharacter" ADD CONSTRAINT "StudioCharacter_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
