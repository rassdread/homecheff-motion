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
 * ## V3+ considerations
 *
 * - Locations, props, storyboards persistence (same service pattern)
 * - Link storyboard scenes to Motion wizard scene slots
 * - Pass character reference images into Vidu multi-image prompts
 * - Render-version snapshots may store Studio asset IDs used per export
 * - System character seeds (`isSystemCharacter`) — see `docs/studio-characters-future.md`
 */

export const STUDIO_INTEGRATION_ARCHITECTURE_VERSION = "v1" as const;
