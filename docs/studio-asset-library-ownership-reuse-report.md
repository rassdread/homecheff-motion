# Studio Asset Library Ownership & Reuse Report

## Asset Library Audit

| Asset type | Storage | Ownership | Library visibility | Download before |
|------------|---------|-----------|-------------------|-----------------|
| Characters | Prisma `StudioCharacter` | `ownerId` | Per-type + `/studio/assets` | No |
| Props | Prisma `StudioProp` | `ownerId` | Per-type + `/studio/assets` | No |
| Locations | Prisma `StudioLocation` | `ownerId` | Per-type + `/studio/assets` | No |
| Worlds | Prisma `StudioWorldProfile` | `ownerId` | Per-type only | N/A |
| Generated references | Blob `studio/{userId}/wizard-references/` | Blob path + `ProviderCostEvent.userId` | Count only in My Studio | No |
| Scene images | Prisma `StudioSceneImage` | Via storyboard `ownerId` | Storyboard context | No |
| Voice clones | Blob manifest | `ownerId` in path | My voices | Audio only |
| Canonical refs | JSON in entity notes | Entity `ownerId` | Derivation sources | No |

**Gaps addressed:** worlds in unified library, generated history, favorites, downloads, reuse actions.

## My Assets Structure

`/studio/assets` is now **My Assets** — personal creator library with tabs:

All · Favorites · Recent · Characters · Props · Locations · Worlds · Images · Generated · Derived · Voice · Music · Sound

Features: grid/list toggle, debounced search, origin filter, sort, mobile filter sheet, detail panel with actions.

## Folders / Collections

**Personal presets** (blob-backed, no schema):

- Favorites
- Recently used
- Generated
- Uploaded
- Derived

**Brand presets** (existing): HomeCheff Mascots, HomeGarden Pack, etc.

Preferences manifest: `studio/{userId}/asset-library/manifest.json`

## Downloadable Generated Images

- Download via `/api/studio/asset-library/download` proxy
- Copy link to clipboard
- Available in asset detail panel for all assets with `previewUrl` / `downloadUrl`
- Generated references include full-resolution blob URL

## Reuse Actions

Detail panel actions:

- Download image
- Copy link
- Favorite (persisted)
- Make variant → entity create with derive query
- Open entity detail

## Voice Favorites

- `StudioVoiceFavoriteButton` on marketplace recommendation cards
- Persisted in preferences manifest (`voiceFavorites[]`)
- API: `PATCH /api/studio/asset-library/preferences` with `toggle_voice_favorite`

## Recent Voices

- `recentVoices[]` in manifest
- `record_voice_recent` API action (ready for preview/select wiring)
- Clone library already computes `lastUsedAt` from character/storyboard usage

## Generated Image History

- `GET /api/studio/asset-references/history` — lists user generations from `ProviderCostEvent`
- Reconstructs blob URLs from `relatedJobId` + `assetKind` metadata
- New generations store `promptSummary` + `assetKind` in cost event metadata
- Surfaced in `/studio/assets` Generated tab

## Filter UX

Origin: All · Generated · Uploaded · Derived · Manual  
Sort: Newest · Oldest · Name A–Z/Z–A · Recently used  
Collection: personal presets + brand packs

## Search

Client-side debounced search (300ms) over name, description, tags, prompt summary, entity id, generation id.

## Ownership & Privacy

- All APIs use `requireActiveUser()` and filter by `userId`
- History API admin override only with `canAccessAdmin`
- Admin sees `storageKey`, `costEventId`, `provider` in history/detail; users do not
- Registry scoped to user-owned + system catalog

## My Studio Integration

Dashboard links:

- All assets → `/studio/assets`
- Favorites → `/studio/assets?filter=favorites`
- Generated → `/studio/assets?tab=generated`

`librarySummary` adds favorites + voice favorites counts.

## Mobile UX

- Horizontal scroll tabs
- Collapsible filter sheet on small screens
- 44px+ touch targets on cards and actions
- Grid cards instead of wide tables

## Tests/build status

New tests:

- `studio-asset-library-filters.test.ts`
- `studio-asset-download.test.ts`
- `studio-asset-library-preferences.test.ts`

Run: `npx prisma validate`, `npx prisma generate`, `npm run lint`, `npm run build`, `npm run test`.
