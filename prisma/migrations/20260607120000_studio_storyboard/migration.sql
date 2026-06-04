-- CreateTable
CREATE TABLE "StudioStoryboard" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioStoryboard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudioScene" (
    "id" TEXT NOT NULL,
    "storyboardId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "action" TEXT NOT NULL DEFAULT '',
    "emotion" TEXT NOT NULL DEFAULT '',
    "camera" TEXT NOT NULL DEFAULT '',
    "transitionToNext" TEXT NOT NULL DEFAULT '',
    "durationSeconds" INTEGER NOT NULL DEFAULT 5,
    "locationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioScene_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudioSceneCharacter" (
    "sceneId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,

    CONSTRAINT "StudioSceneCharacter_pkey" PRIMARY KEY ("sceneId","characterId")
);

-- CreateTable
CREATE TABLE "StudioSceneProp" (
    "sceneId" TEXT NOT NULL,
    "propId" TEXT NOT NULL,

    CONSTRAINT "StudioSceneProp_pkey" PRIMARY KEY ("sceneId","propId")
);

-- CreateIndex
CREATE INDEX "StudioStoryboard_ownerId_idx" ON "StudioStoryboard"("ownerId");

-- CreateIndex
CREATE INDEX "StudioScene_storyboardId_order_idx" ON "StudioScene"("storyboardId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "StudioScene_storyboardId_order_key" ON "StudioScene"("storyboardId", "order");

-- AddForeignKey
ALTER TABLE "StudioStoryboard" ADD CONSTRAINT "StudioStoryboard_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioScene" ADD CONSTRAINT "StudioScene_storyboardId_fkey" FOREIGN KEY ("storyboardId") REFERENCES "StudioStoryboard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioScene" ADD CONSTRAINT "StudioScene_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "StudioLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioSceneCharacter" ADD CONSTRAINT "StudioSceneCharacter_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "StudioScene"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioSceneCharacter" ADD CONSTRAINT "StudioSceneCharacter_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "StudioCharacter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioSceneProp" ADD CONSTRAINT "StudioSceneProp_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "StudioScene"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudioSceneProp" ADD CONSTRAINT "StudioSceneProp_propId_fkey" FOREIGN KEY ("propId") REFERENCES "StudioProp"("id") ON DELETE CASCADE ON UPDATE CASCADE;
