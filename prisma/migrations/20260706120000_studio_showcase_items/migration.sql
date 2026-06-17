-- CreateTable
CREATE TABLE "StudioShowcaseItem" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "description" TEXT NOT NULL,
    "mediaType" TEXT NOT NULL,
    "mediaUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "posterUrl" TEXT,
    "pageKey" TEXT NOT NULL,
    "serviceKey" TEXT,
    "category" TEXT,
    "assistantPrompt" TEXT,
    "ctaLabel" TEXT,
    "ctaHref" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "locale" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioShowcaseItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudioShowcaseItem_pageKey_isActive_sortOrder_idx" ON "StudioShowcaseItem"("pageKey", "isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "StudioShowcaseItem_serviceKey_idx" ON "StudioShowcaseItem"("serviceKey");

-- CreateIndex
CREATE INDEX "StudioShowcaseItem_locale_idx" ON "StudioShowcaseItem"("locale");

-- AddForeignKey
ALTER TABLE "StudioShowcaseItem" ADD CONSTRAINT "StudioShowcaseItem_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
