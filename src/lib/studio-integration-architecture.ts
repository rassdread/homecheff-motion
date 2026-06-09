/**
 * HomeCheff Studio ↔ Motion integration architecture (V1 — documentation only).
 *
 * Motion remains the fast AI video generator. Studio will become the reusable
 * asset library and pre-production layer for longer-form movies.
 *
 * ## Planned end-to-end flow
 *
 * ```
 * Studio
 *   ↓
 * Characters · Locations · Props · Storyboards
 *   ↓
 * Scene Composer          (not implemented in V1)
 *   ↓
 * Motion Render Engine    (existing instant / premium pipeline)
 *   ↓
 * Vidu                    (provider)
 *   ↓
 * Video
 * ```
 *
 * ## V1 scope
 *
 * - Navigation: Motion | Studio | My Videos
 * - Studio landing + placeholder routes for the four alpha pillars
 * - TypeScript models in `@/types/studio` (no Prisma tables)
 *
 * ## Out of scope (V1)
 *
 * - Scene Composer UI and APIs
 * - Character / location / prop generation
 * - AI world generation
 * - CRUD, uploads, or project linking from Studio assets to Motion jobs
 *
 * ## V2 (Characters Library)
 *
 * - `StudioCharacter` Prisma model + CRUD service (`@/server/studio/studio-character-service`)
 * - `CharacterSnapshot` for future Motion handoff (`@/types/studio-character-snapshot`)
 *
 * ## V3 (Locations Library)
 *
 * - `StudioLocation` Prisma model + CRUD service (`@/server/studio/studio-location-service`)
 * - `LocationSnapshot` for future Motion handoff (`@/types/studio-location-snapshot`)
 *
 * ## V4 (Props Library)
 *
 * - `StudioProp` Prisma model + CRUD service (`@/server/studio/studio-prop-service`)
 * - `PropSnapshot` for future Motion handoff (`@/types/studio-prop-snapshot`)
 * - Shared helpers: `studio-reference-blob`, `studio-asset-slug`, `studio-asset-search`
 *
 * ## Planned Motion handoff (not wired yet)
 *
 * ```
 * Studio Character → CharacterSnapshot
 *   ↓
 * Scene Composer
 *   ↓
 * Motion Prompt Builder
 *   ↓
 * Vidu
 *   ↓
 * Video
 * ```
 *
 * ## V5 (Storyboards & Scene Composer)
 *
 * - `StudioStoryboard` + `StudioScene` + junction models (`@/server/studio/studio-storyboard-service`)
 * - `StoryboardSnapshot` / `SceneSnapshot` for future Motion handoff
 * - Scene Composer links Characters, Locations, Props per scene (no Vidu wiring)
 *
 * ## V6 (Motion handoff)
 *
 * - `MotionHandoffPayload` (`@/types/motion-handoff-payload`)
 * - `createMotionHandoffPayload()` — Studio → import route → wizard localStorage
 * - Per-slot `studioContext` on `PersistedWizardSceneSlot` (not sent to Vidu yet)
 *
 * ## V7 (Prompt Builder)
 *
 * - `buildScenePrompt()` from `SceneSnapshot` + style profile (`@/lib/studio-prompt-builder`)
 * - Storyboard `promptStyleProfile` (commercial default)
 * - `MotionHandoffPayload` v2 stores `generatedPrompt` / continuity (not sent to Vidu yet)
 * - Scene Composer Prompt Preview tab
 * - Future flow: `docs/studio-prompt-ai-future.md`
 *
 * ## V8 (Scene Image Generator)
 *
 * - `StudioSceneImage` + `generateStudioSceneImage()` (`@/server/studio/studio-scene-image-service`)
 * - `SceneImageProvider` registry (`@/server/scene-image-providers`) — OpenAI images or mock
 * - `selectedSceneImageId` for Motion prep (handoff stores URL metadata, no Vidu yet)
 * - Docs: `docs/studio-scene-image-future.md`, `docs/studio-character-engine-future.md`
 *
 * ## V9 (Motion image import)
 *
 * - Handoff v3 pre-fills Motion wizard images (`imageSource: studio`)
 * - Refresh from Studio, metadata on `PersistedWizardImage`
 * - Docs: `docs/studio-motion-image-import-future.md`
 *
 * ## V10+ considerations
 *
 * - Pass reference images into Vidu multi-image prompts
 * - Character memory / packs — see `docs/studio-character-engine-future.md`
 * - Render-version snapshots may store scene image `generationVersion` per export
 *
 * ## V11 (HomeCheff AI Suite — Phase 5)
 *
 * Five-product platform architecture (Editor · Studio · Motion · Publish · Library):
 *
 * - Types: `@/types/homecheff-product-suite`, `homecheff-visual-editor`, `homecheff-presentation-suite`
 * - Registry: `@/lib/homecheff-product-suite` — workflows, audit, billing foundation
 * - Navigation: `@/lib/homecheff-primary-nav-config` (opt-in via `NEXT_PUBLIC_HOMECHEFF_PRODUCT_SUITE_NAV`)
 * - Editor foundation: object manipulation, body designer, placement canvas (`homecheff-visual-editor-foundation`)
 * - Presentation foundation: safe areas, feature map (`homecheff-presentation-foundation`)
 * - Studio integrated flow: Editor → Studio → Motion → Presentation (single UX inside Studio)
 * - Assets hub sections unchanged (`studio-asset-hub-sections`) — shared by all products
 * - Composition graph + reference placement from Universal Asset Generation Workbench
 * - No new providers, render pipeline, motion pipeline, or Prisma migrations
 *
 * Docs: `docs/homecheff-ai-suite-architecture-phase5-report.md`, `docs/product-suite-naming-refinement-report.md`
 */

export const STUDIO_INTEGRATION_ARCHITECTURE_VERSION = "v11-phase5" as const;
