-- Additive nullable spoken dialogue for one scene.
-- Existing rows stay NULL. No backfill, no rewrite of descriptions,
-- subtitles, narration, character masters, or project links.
-- Adds a nullable column. No default, no row rewrite, no table drop.

-- AlterTable
ALTER TABLE "StudioScene" ADD COLUMN "dialogueText" TEXT;
