# Asset Library Truth Audit

Audit date: 2026-06-08

## Problem

| Surface | Count shown | Definition (before fix) |
|---------|-------------|-------------------------|
| **Mijn Studio → All assets** | 0 | Sum of Prisma `COUNT(*)` on `StudioCharacter`, `StudioProp`, `StudioLocation`, `StudioWorldProfile` |
| **Mijn Assets (`/studio/assets`)** | 41 | `filtered.length` on expanded `StudioAsset[]` registry |

The dashboard counted **saved database entities only**. The asset library counted **registry rows** (user entities + sub-assets + system catalog + generated blob history).

## Root cause

Two different data models were used:

1. **Entity model** — one Prisma row per character/prop/location/world.
2. **Registry model** — one row per browsable asset in the library, including:
   - ~28 system audio tracks
   - 6 voice presets
   - 6 brand assets
   - Extra rows per entity (reference images, mouth overlays, character voice links)
   - Generated reference blobs from wizard history (up to 50)

With zero saved entities, the library still shows **~40 system catalog entries** via `buildStudioAssetRegistry({ includeSystemCatalog: true })` and `userOwnedAssetsOnly()` (which keeps `owner === userId || owner === "system"`).

## Asset classification

| Category | Where it lives | In old dashboard “All assets”? | In library? |
|----------|----------------|-------------------------------|-------------|
| **User-owned saved** | Prisma entities + linked registry rows | Only entity row (1×) | Yes (often multiple registry rows per entity) |
| **System-owned** | Registry `owner: "system"` | No | Yes (~40) |
| **Generated-only** | Blob + `ProviderCostEvent`, `origin: "generated"` | No (monthly stat only) | Yes, tab `generated` |
| **Derived-only** | Same pipeline, `origin: "derived"` | No | Yes, tab `derived` |
| **Accepted references** | `reference_image:char_*`, `loc_*`, `prop_*` on saved entities | No | Yes, tab `reference_image` |
| **Drafts** | Client `AssetWizardDraft` (localStorage) | No | No — not in registry until saved |

Secondary mismatch: dashboard **Generated** used `assetReferencesGenerated` (cost events **this month**), while library tab **Generated** showed lifetime blob history.

## Fix — single source of truth

Shared module: `src/lib/studio-asset-library-counts.ts`

- `computeStudioAssetLibraryCounts()` — same registry + filter pipeline as the library UI (`applyAssetLibraryFilters`, `userOwnedAssetsOnly`).
- Classification helpers: `isBlobGeneratedReferenceAsset`, `isAcceptedReferenceAsset`.

Server loader: `src/server/studio/load-user-studio-asset-registry.ts`

- Builds the same registry as the client library page.
- Returns `libraryCounts` for dashboard API.

### Wired surfaces

| Surface | Count source |
|---------|--------------|
| **Mijn Studio → All assets** | `libraryCounts.all` |
| **Mijn Studio → Favorites / Generated** | `libraryCounts.byTab.*` |
| **Mijn Studio → Characters/Props/Locations/Worlds** | `assetCounts.*` (saved entity rows — links to entity list pages) |
| **Mijn Assets header + tabs** | Client `computeStudioAssetLibraryCounts()` + tab badges |
| **Mijn Assets result line** | `applyAssetLibraryFilters()` → `filtered.length` |

Dashboard entity links (`/studio/characters`, etc.) intentionally keep **Prisma entity counts** — those pages list saved entities, not registry rows.

## Expected counts (empty user, system catalog enabled)

- `libraryCounts.all` ≈ **41** (40 system + 0 user registry rows, or +1 per generated blob in history)
- `assetCounts.characters + props + locations + worlds` = **0**
- `libraryCounts.savedEntities.total` = **0**
- `libraryCounts.systemOwned` ≈ **40**
- `libraryCounts.userOwned` = generated/history + any saved entity registry rows

## Tests

`src/lib/studio-asset-library-counts.test.ts` — parity between `all`, `byTab.all`, system catalog baseline, and reference classification.
