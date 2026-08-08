# Studio S.5 — Canonical Asset Library

## Principle

**Generation is temporary. Assets are permanent.**

Nothing Studio generates should disappear from creative memory. Domain entities (characters, locations, blob manifests) remain sources of truth where they already exist; `StudioLibraryAsset` is the **canonical index** for search, reuse, favorites, versions, and relationships.

## Asset families

`image | video | voice | music | sfx | subtitle | character | location | prop | world | brand | prompt_preset | upload | other`

One library — not feature-siloed tables for browse/search.

## Ownership (no orphans)

Every asset stores:

- Owner (`ownerId`)
- Optional project (`projectId`)
- Origin (`generated | uploaded | derived | manual | system | imported`)
- Backing store + `sourceKind` / `sourceId` (unique per owner)
- Optional `generationJobId`, `parentAssetId`
- Favorite / archive / soft-delete timestamps

## Metadata (visible)

Title, description, tags, AI model, generator, prompt summary, credits spent, resolution, duration, language, aspect ratio, status, usage count, `metadataJson`.

## Search

`/api/studio/library/search?q=` — token match across name, tags, prompt, language, duration text, metadata. Semantic search is future.

Pagination: `offset` / `limit` (max 200). List loads capped (500) then filtered — no full-library client dump.

## Collections

`StudioAssetCollection` + members. Members are references — **never duplicate files**.

## Favorites

`StudioFavorite` universal targets: project, asset, voice, character, music, prompt_preset, brand_kit, collection.

## Versions

`StudioLibraryAssetVersion` — append-only `v1…vn`. Head URLs may update; prior versions never overwritten.

## Relationships

`StudioAssetRelation` (`uses_voice`, `derived_from`, `subtitle_of`, …) — unique per from/to/type.

## Usage tracking

`StudioAssetUsageEvent` + `usageCount` increment. Safe analytics foundation.

## Safe delete

1. Archive  
2. Restore  
3. Soft delete (`deletedAt`)  
4. Hard delete only with `force` when dependencies block  

Dependency inspection returns collections, relations, usage, derived children.

## Upload library

Uploads upsert as first-class assets (`origin=uploaded`, family `upload` or media family). Temporary upload concept is rejected at the index layer.

## AI library

Characters / locations / props / worlds / styles indexed via `/api/studio/library/sync` from the virtual registry.

## Generation attach (S.4)

On job `succeeded` + `outputAssetId`, orchestrator best-effort calls `registerLibraryAssetFromGeneration`. Failures never fail generation.

## APIs

| Route | Role |
|-------|------|
| `/api/studio/library/assets` | List / upsert |
| `/api/studio/library/assets/[id]` | Get + deps / favorite / archive |
| `…/versions` | Version history |
| `…/usage` | Record usage |
| `…/delete` | Safe delete |
| `/api/studio/library/search` | Smart search |
| `/api/studio/library/collections` | Collections |
| `/api/studio/library/favorites` | Favorites |
| `/api/studio/library/relations` | Relations |
| `/api/studio/library/sync` | Index virtual registry |

## Future (prepare only)

- Enterprise shared libraries / org ownership  
- Marketplace product media compatibility  
- Growth campaign asset refs  
- Semantic search  

No runtime coupling to Marketplace / Growth / Central Identity.
