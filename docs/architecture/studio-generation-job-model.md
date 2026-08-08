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
| `providerJobId` | Provider-native id for async_poll |
| `inputSnapshotJson` | Safe refs/IDs (avoid private prompt dumps) |
| `outputAssetId` | Attached result id |

## Status lifecycle

`pending → queued → starting → generating → processing → succeeded | failed`  
also: `cancel_requested → cancelled`

UI consumes these states only (via `StudioGenerationUiContract`).

## Operational history

`GET /api/studio/generation-jobs?storyboardId=…` (or `animationProjectId`) returns:

- type (capability), status, created/completed, result, safe error  
- `technicalRetryEligible` vs `newGenerationRequiresNewKey`  

This is **not** the S.5 media library.

## Recovery

| Failure | Path |
|---------|------|
| Provider success, storage/attach fail | `markGenerationStorageFailure` → `POST …/recover` (no recharge) |
| Charge captured, local completion fail | `chargeFinalized` remains true; technical retry only |
| Provider reject / timeout | `failed` + refund via existing bill path |

## Compatibility

- Legacy `StudioJob` (bulk V15) remains for multi-scene batch UI — **ADAPT**, do not remove until parity.  
- Bulk runner **must** bill per scene image/improve step (S.4 fix).  
- Motion `AnimationTransition.providerJobId` remains provider-native; project-level VIDEO_GENERATE job links them.
