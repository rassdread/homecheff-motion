# Asset Lifecycle Completion Report

**Date:** 2026-06-06  
**Scope:** Close build_new → create → fulfill loop using existing systems only.

---

## Samenvatting

Na asset-creatie markeert Studio nu automatisch de bijbehorende registry-beslissing als **voltooid** (`use_existing` + `existingId` + `fulfilledAt`). Creation Assistant, Production Planner en AI Director zien de asset direct.

---

## Lifecycle completion

**Resolver:** `src/lib/studio-asset-lifecycle-resolver.ts`

```
Asset created → findDecisionToFulfill → fulfillAssetDecision → save registry
```

**Client:** `src/lib/studio-asset-lifecycle-client.ts` — `completeAssetLifecycleAfterCreate()`

---

## Asset matching

1. By `decisionId` (from Identity Builder prefill)
2. By `kind` + `name` (case-insensitive, includes match)
3. Single pending `build_new` for kind (fallback)

---

## Registry updates

- `build_new` → `use_existing` with `existingId`
- `fulfilledAt` timestamp set on completion
- Display status via `getAssetLifecycleDisplayStatus()`:
  - Use existing | In progress | **Completed** | Skipped

---

## Creation Assistant

- Loads registry per storyboard
- Pending `build_new` → "In progress" task (next tier)
- Fulfilled → completed item
- Missing/guidance filtered for pending + fulfilled decisions

---

## Production Planner

- Workspace panel loads registry
- `filterProductionMissingItemsByDecisions` extended for pending/fulfilled

---

## AI Director

- Proposal builder passes registry to Creation Assistant
- Director flow reloads registry when assets change
- Fulfilled `use_existing` injected on scene 0 (existing behavior)

---

## Call sites

| Location | Behavior |
|----------|----------|
| `studio-workspace-asset-create-sheet` | Fulfill on save + scene link |
| `characters/locations/props/worlds/new` | Prefill + fulfill + redirect to workspace |
| Production Brief | Lifecycle status badges |

---

## Bewust niet gebouwd

- Server-side registry persistence (localStorage only)
- World decision UI in Production Brief
- Auto scene-link from standalone new pages (workspace redirect only)
- `filterAssetEvolutionByDecisions` wiring
- New AI / planners / identity builders

---

## Volgende sprint

1. Persist registry on storyboard (optional Prisma field)
2. World decision UI in Brief
3. Auto scene-link after brief-path create
4. Wire evolution panel to decision filters

---

## Validatie

| Check | Status |
|-------|--------|
| `npx prisma validate` | Run at riedel |
| `npm run lint` | Run at riedel |
| `npm run build` | Run at riedel |
| `npm run test` | ✅ **1786/1786** (+8 lifecycle tests) |
