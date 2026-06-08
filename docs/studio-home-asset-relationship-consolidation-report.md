# Studio Home & Asset Relationship Consolidation Report

## Route audit

| Route | Before | After |
|-------|--------|-------|
| `/studio` | Empty shell or auto-resume workspace | **Studio home dashboard**; workspace when `?storyboardId=` |
| `/studio/my-studio` | Separate dashboard | **Redirects → `/studio`** |
| `/studio/advanced` | Legacy feature hub | **Redirects → `/studio`** |
| `/studio/workspace` | Redirect shim | Unchanged (→ `/studio?storyboardId=`) |
| `/studio/storyboards/[id]` | Redirect to workspace | Unchanged |
| Libraries / create / detail | Per-kind routes | Unchanged; wizard remains default create path |

**Recommended route map:** `/studio` = home; `/studio?storyboardId=` = workspace; libraries and `/studio/assets` = asset hub.

## Studio home redesign

- `StudioHomeDashboard` — quick actions, continue working, recent storyboards, usage this month, library counts, activity feed.
- Data from `GET /api/me/studio-insights?view=dashboard` (extended with `continueWorking`, `recentStoryboards`).
- No auto-redirect to last storyboard — user chooses via **Continue working** cards.

## Asset usage graph

- `GET /api/studio/asset-usage?kind=&id=` — storyboard + scene links for character, prop, location, world.
- `StudioAssetUsagePanel` on asset library detail, character/prop/location/world detail pages.
- World assets also show linked characters, props, locations.

## Storyboard relationships

- `GET /api/studio/storyboards/[id]/relationships` — scenes → characters, props, location, worlds, voices, generated image flag.
- `StudioStoryboardRelationshipsPanel` on storyboard edit page.

## Create flow consolidation

- All kinds use `StudioAssetCreationPage` + wizard by default (`?advanced=1` for builder).
- `existing_asset` normalized → `derive_from_reference` (unchanged).
- `CharacterCreateEntryChoice` remains advanced-form only.

## Legacy cleanup

| Item | Action |
|------|--------|
| `/studio/my-studio` | Redirect to `/studio` |
| `/studio/advanced` | Redirect to `/studio` |
| Nav links to my-studio | Updated → `/studio` |
| `existing_asset` wizard path | Code redirect to derive flow |
| Auto-resume recent storyboard on `/studio` | **Removed** |

## Continue working system

- Server: `updatedAt` ordering across storyboards + all asset kinds in dashboard report.
- Up to 8 items with deep links to workspace or detail pages.

## Activity feed

- Existing `recentActivity` (last 12 items, 30-day cost/create events).
- No COGS, margins, or provider costs exposed.

## UX consistency

- Shell nav: **Studio home** → `/studio`.
- Home copy keys under `studio.home.*` (EN + NL).
- Asset usage: **Where is this used?** / **Waar wordt dit gebruikt?**

## Mobile UX

- Home dashboard: responsive grids, `min-h-[44px]` / `min-h-[48px]` touch targets, stacked cards.
- Asset usage and relationship panels: stacked layout, full-width links.

## Tests/build status

| Check | Status |
|-------|--------|
| prisma validate | pass |
| prisma generate | pass |
| lint | pass (0 errors) |
| build | pass |
| tests | **2181/2181** pass |

New: `src/lib/studio-home-consolidation.test.ts`
