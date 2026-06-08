# Voice Marketplace Search Performance Fix Report

## Root cause

`VoiceLibraryBrowsePanel` bound the search `<input>` directly to `filters.query` via `setFilters` on every `onChange` keystroke. Each update recomputed:

- `buildFacetedMarketplaceFilterOptions`
- `buildFacetedAccentCoverage`
- `buildFacetedCountryCoverage` / region coverage
- `filterMarketplaceEntries` over the full ~12k catalog

Typing felt laggy because filtering ran per keypress and the active filter chip updated before the user finished a word.

## Debounced search

**Split state:**

| State | Purpose |
|-------|---------|
| `searchInput` | Immediate input value (typing never blocked) |
| `debouncedSearch` | Value used for filtering (400ms delay) |

**Hook:** `useDebouncedMarketplaceSearch` + `createMarketplaceSearchDebouncer` with generation guard.

**Immediate actions:**

- **Enter** → `flushSearch()` applies `searchInput` instantly
- **Escape** / clear / empty input → `clearSearch()` resets both states instantly

## Filter recompute reduction

Heavy memos now depend on `appliedFilters` from `buildMarketplaceAppliedFilters(structuralFilters, debouncedSearch)` — not raw keystrokes.

Structural filters (country, accent, language, gender, age, category) still apply immediately.

**Minimum query length:** 0–1 characters skip text search; structural filters remain active. Enforced in `resolveMarketplaceSearchQuery`, `filterVoiceLibrary`, and clone filtering.

## Stale result protection

`createMarketplaceSearchDebouncer` increments a generation counter per schedule. Only the latest generation may call `setDebouncedSearch`. Fast typing (`r` → `ro` → `rot` → `rotte`) applies only `rotte`.

## Memoization

Existing `useMemo` blocks retained; dependencies switched from `filters` to `appliedFilters` for:

- faceted filter options
- accent / country / region chips
- filtered voice list
- paging `filterKey`

## Tests/build status

New: `src/lib/studio-voice-marketplace-search.test.ts` (6 tests)

- min query length
- applied filter shaping
- pending state detection
- debouncer stale protection + flush
- browse panel wiring (no per-keystroke `setFilters` for query)

Run: `npm run lint`, `npm run build`, `npm run test`.
