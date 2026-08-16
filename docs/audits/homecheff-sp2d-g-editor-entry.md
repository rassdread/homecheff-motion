# SP.2D-G — Studio workspace / editor entry performance

## Boundary

Performance / technical architecture only. No Studio×HomeCheff product UX redesign.

## Baseline (Production warm, local studio_session)

Storyboard: `cmswdyqdo0001lc049saxzy14` (3 scenes, light library)

| Sample | shell | editable | hydrate |
|--------|------:|---------:|--------:|
| 1 | 496 | 838 | 839 |
| 2 | 591 | 1373 | 1373 |
| 3 | 463 | 787 | 787 |

| Metric | p50 | worst |
|--------|----:|------:|
| shell | 496 | 591 |
| editable | 838 | 1373 |
| hydrate | 839 | 1373 |

JSON ~10.7 KB · JS ~5.8 MB · media 0 · session 1 · account 1 · SSO no

## Dependency map (pre-G)

| Dependency | Class |
|------------|-------|
| AuthGate + shell dynamic chunk | REQUIRED_BEFORE_SHELL |
| `GET` storyboard detail | REQUIRED_BEFORE_EDITABLE |
| characters / locations / props / worlds / memory | were artificial REQUIRED (Promise.all) → **SECONDARY** |
| workspace-state hydrate / motion-projects | BACKGROUND |
| assistant recent / pricing / wallet | BACKGROUND |
| Triple storyboard ACL reloads | DUPLICATE (background) |

Blocking chain was: serial auth → **parallel-but-blocking** 6-way Promise.all → chrome.

## Implementation (min set)

1. Storyboard-first `load()`: `setLoading(false)` after storyboard; entities hydrate afterward (`entitiesHydrating`).
2. Dynamic-import `StudioDirectorPanelV2`.
3. Skip auth network when `session.user` already resolved.
4. Soft entity failures preserved; auth/storyboard failures still hard-block.

No storyboard payload slim (light boards already small; fat include left for correctness). No UX redesign.

## Autosave

Scene edits remain **manual save** via `updateStudioSceneApi`. Open resets `sceneDirty=false`. No write-on-open.
