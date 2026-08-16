# SP.2D-F — Studio library / bootstrap / editor entry performance

## Status

Implementation complete on branch `feat/sp2d-f-studio-library-bootstrap`. Do not reopen SP.2D-E.

## Baseline (accepted C1, warm local session)

| Metric | Value |
|--------|-------|
| Warm S1 usable | ~1946 ms |
| studio-account | 4 → 1 |
| library-consistency | 2 → 1 (still ~0.5–1.2 s for remaining call) |

## Trace (product path after session)

### Library / home bootstrap (before)

| Call | Class | Notes |
|------|-------|-------|
| `/api/auth/session` | BLOCKING | AppShell |
| `/api/me/studio-account?view=summary` | PARALLEL | C1 single-flight |
| `POST /api/studio/library-consistency/query` limit 500 | BLOCKING-ish | Home limit=8 still forced 500 bootstrap |
| Assistant idle → same query 500 | DUPLICATE/DEFERABLE | Coalesced with home but fat |
| `/api/me/studio-insights?view=dashboard` | BLOCKING home UI | ~19 Prisma + sequential asset registry |
| Orchestrator panel | Eager import | Editor-ish weight on home |

### After SP.2D-F

| Call | Class |
|------|-------|
| `GET .../library-consistency/recent?limit=8` | PARALLEL (home cards) |
| Assistant idle → `recent?limit=40` | DEFERABLE (idle 2.5s) |
| Manifest blob | 8s in-process cache + invalidate on write |
| `view=shell` then `view=dashboard` | TIER1 / TIER3 |
| Orchestrator | `next/dynamic` |
| Workspace session | reuse cache (`force` removed) |
| Browse/hub `query` limit 500 | unchanged, still coalesced |

## Changes

1. **Manifest cache** — `library-consistency-manifest-blob.ts` TTL 8s; invalidate on upsert.
2. **Home** — `fetchRecentLibraryAdditions(8)` instead of query bootstrap.
3. **Assistant** — recent(40) after longer idle; no 500 query on home path.
4. **`view=shell`** — continue/recent + entity counts; skips insights month scan + `loadUserStudioAssetRegistry`.
5. **Home UI** — paint shell/orchestrator/quick links immediately; progressive dashboard.
6. **Workspace** — `fetchAuthSessionJson()` without force.
7. **Recent API** — max limit 40 → 80 (matches motion attach callers).

## Out of scope (honored)

SSO, Growth, favicon, Vercel/Neon region, Fluid, cookie semantics, DIRECT_URL.

## Quality

- Targeted tests: `src/lib/sp2d-f-studio-bootstrap.test.ts` + C1 dedupe
- lint / tsc / build — record in PR

## Remaining bottlenecks (next phase candidates)

- Fat workspace parallel load (storyboard + characters + locations + props + worlds + memory) before shell
- Full `view=dashboard` still heavy when usage/libraryCounts needed
- Blob manifest still full-fetch on cold instance (no CDN slice API)
- Editor chunk graph beyond dynamic orchestrator
