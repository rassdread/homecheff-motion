# Studio Generation Job Model (S.4)

**Status:** CANONICAL  
**Prisma model:** `StudioGenerationJob`  
**ADR:** ADR-STUDIO-006

## Purpose

One product-level generation job per paid/async generation intent.

Does **not** replace the wallet ledger. Credits still flow through `authorizeStudioAction` → capture/refund.

## Key fields

| Field | Role |
|-------|------|
| `idempotencyKey` | Unique per owner — double-submit safe |
| `sceneId` / `storyboardId` | Immutable target (set at create) |
| `capability` | Product capability (`IMAGE_GENERATE`, …) |
| `actionType` | Credit registry key |
| `status` | Canonical lifecycle |
| `chargeFinalized` | At most one capture recorded |
| `inputSnapshotJson` | Safe refs/IDs (avoid private prompt dumps) |
| `outputAssetId` | Attached result id |

## Status lifecycle

`pending → queued → starting → generating → processing → succeeded | failed`  
also: `cancel_requested → cancelled`

UI consumes these states only (via `StudioGenerationUiContract`).

## Compatibility

- Legacy `StudioJob` (bulk V15) remains for multi-scene batch UI.
- Bulk runner **must** bill per scene image/improve step (S.4 fix).
- Motion `AnimationTransition.providerJobId` remains provider-native; align UX via adapters over time.
