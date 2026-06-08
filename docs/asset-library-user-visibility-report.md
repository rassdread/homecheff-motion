# Asset Library — User Visibility, Upload Reuse & System Hiding

## Visibility rules

| Class | Meaning | Default for users |
|-------|---------|-------------------|
| `user_owned` | Uploads, entities, generated/derived refs, voice clones | **Shown** |
| `system_usable` | System catalog with preview/download in picker context | Shown only in matching picker |
| `system_hidden` | Demo music/sound, internal audio catalog | **Hidden** |
| `admin_only` | Brand catalog | Hidden (admin toggle does not expose) |
| `placeholder` | Voice presets without direct use | **Hidden** |

Classification: `src/lib/studio-asset-visibility.ts` · types: `src/types/studio-asset-visibility.ts`

Default library filter (`filterUserLibraryAssets`): user-owned only. Admins may enable **Show system assets** in My Assets.

## System asset hiding

- System audio registry → `system_hidden`
- Voice presets → `placeholder`
- Brand catalog → `admin_only`
- Assets without preview and without usable action in voice/music/sound → hidden

`assembleUserStudioAssetRegistry` sets `includeSystemCatalog` only when `showSystemAssets && isAdmin`.

## Upload reuse

Unified blob manifest: `studio/{ownerId}/user-uploads/manifest.json`

Registered on:

- `POST /api/uploads/images` — image uploads (optional `assetType`, `originContext` form fields)
- Audio library upload — `uploadOwnerAudioLibraryAsset` (music/sound)

Each record stores: `ownerId`, `assetType`, `sourceType=uploaded`, `mimeType`, `fileName`, `storageKey`, URLs, `createdAt`, `originContext`.

After upload:

- Visible in **My Assets** via `fetchUserUploadLibrary` + registry extensions
- Reusable in **Asset Creation Wizard** via `listAssetDerivationSources` (upload rows as `sourceType: upload`)
- Deduped by `storageKey` in registry assembly and manifest write

## Contextual picker behavior

`StudioAssetPicker` (`src/components/studio/studio-asset-picker.tsx`) wraps the workspace picker with `filterAssetsForPickerContext`:

| Context | Shows |
|---------|--------|
| `reference_image` | Images with preview: refs, generated, derived, characters/props/locations |
| `voice` | Voice clones, voice samples, user uploads — not placeholders |
| `music` | User music uploads + usable system music |
| `sound` | User sound uploads + usable sfx/ambience |

System rows appear only when `system_usable` for that context.

## User-owned counts

- `loadUserStudioAssetRegistry` / My Assets use filtered registry
- `computeStudioAssetLibraryCounts`: `all` = user-visible rows; `systemOwned` = 0 unless admin system toggle
- Dashboard **Alle assets** aligns with `libraryCounts.all` (user-owned only)
- Admin snapshot exposes `systemAssetCount` separately when comparing toggled registry

## Tests

`src/lib/studio-asset-visibility.test.ts` — visibility, picker context, uploads, voice clones, counts  
`src/lib/studio-asset-library-counts.test.ts` — updated for user-owned-only baseline
