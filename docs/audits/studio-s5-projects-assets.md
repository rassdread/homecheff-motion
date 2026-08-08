# Studio S.5 — Projects, Assets & Media Library Audit

**Branch:** `refactor/studio-s5-projects-assets-library`  
**Base:** `bf901483`

## Step 1 — Asset landscape (pre-implementation)

### Layers discovered

| Layer | What | Storage | Ownership | Reuse | Discoverability |
|-------|------|---------|-----------|-------|-----------------|
| Prisma creative entities | Character, Location, Prop, World | Postgres | `ownerId` | Strong within Studio | Entity UIs + virtual registry |
| Storyboard / SceneImage | Generated stills | Postgres + blob URLs | Storyboard owner | Weak library index | Storyboard-scoped |
| Motion / AnimationProject | Video jobs & finals | Postgres | Project owner | Weak library index | Motion UI |
| HC / Editor projects | Project files | DB + localStorage risk | User | Fragmented | Separate surfaces |
| Blob manifests | Uploads, audio, voice clones, generated refs, prefs | Vercel Blob | User path | Partial | Virtual registry |
| Virtual `StudioAsset` registry | Assembled view | Ephemeral assembly | Viewer | Read-model only | `/studio/assets` |
| GenerationJob (S.4) | Operational jobs | Postgres | Owner | `outputAssetId` only | Job APIs — **not** media library |
| Style DNA / intelligence cache | Analysis cache | Postgres | Asset-linked | N/A | Internal |
| ShowcaseItem | Admin gallery | Postgres | Admin | Marketing | Public surfaces |

### Disposition

| Action | Targets |
|--------|---------|
| **MIGRATE (index)** | Blob uploads/audio/voice/generated refs → `StudioLibraryAsset` via sync/upsert |
| **ADAPT** | Characters/locations/props/worlds/storyboards/Motion/HC links |
| **WRAP** | Virtual registry + GenerationJob success attach |
| **LEAVE** | Billing, credits, Style DNA, system placeholders, Prompt Matrix (S.6) |

### Gaps closed by S.5 foundation

- No single project SoT → `StudioCreativeProject`
- No durable library index → `StudioLibraryAsset`
- Favorites/collections often blob-prefs → Postgres collections + favorites
- No BrandKit / PromptPreset tables → added (storage only for presets)
- Weak generation→library path → orchestrator best-effort register

## Implementation summary

| Area | Status |
|------|--------|
| Canonical Project System | Implemented |
| Canonical Asset Library | Implemented |
| Metadata | Implemented on asset model + serializers |
| Search | Token search + pagination |
| Collections | Implemented (reference members) |
| Favorites | Universal `StudioFavorite` |
| Version history | Append-only versions |
| Upload Library | Upsert path + sync from uploads registry |
| Brand Kits | Model + API |
| Prompt Presets | Storage only |
| AI Library | Sync from virtual registry families |
| Relationships | `StudioAssetRelation` |
| Usage tracking | Events + usageCount |
| Safe delete | Archive / restore / soft / hard+force |
| Workspace integration | Assets Hub panel (no shell redesign) |
| Performance | Offset/limit; list cap 500; panel lazy fetch |

## Migration

| Field | Value |
|-------|-------|
| Name | `20260809120000_studio_s5_projects_assets_library` |
| Type | Additive CREATE TABLE + indexes + FKs only |
| DROP | None |

## Absolute rules check

| Rule | Result |
|------|--------|
| No S.2 Adaptive Workspace redesign | PASS — hub panel only |
| No S.3 Creative Workflow redesign | PASS |
| No Generation Orchestrator rewrite | PASS — attach-only helper |
| No billing / credits / providers change | PASS |
| No Growth / Marketplace / Identity | PASS |
| No Prompt Matrix / Creative Director | PASS |

## Certification checklist

| Gate | Result |
|------|--------|
| Lint | PASS |
| Build | PASS |
| Tests | **4662/4662** |
| `tsc --noEmit` | PASS |
| Migration deploy | `20260809120000_studio_s5_projects_assets_library` applied to Neon production branch |
| Preview | **GREEN** — `dpl_JBzDGVDGr3JsauBtxDt19DYXq5dK` / `homecheff-motion-nfap861zc-…` via `scripts/_s5-preview-e2e.mjs` |
| Production | (post-merge) |
| Implementation commit | `fc649b7c` |
| PR | #6 |
| Final GO / NO-GO | Pending Production smoke |
