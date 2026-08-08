# Studio Generation Orchestration (S.4)

**Status:** CANONICAL  
**Depends on:** S.1 credit SSOT, S.2 workspace, S.3 generation UX chrome

## Pipeline

```
User intent
  → Studio Generation Request (API)
  → createGenerationJob (idempotent)
  → Orchestrator
  → Provider Adapter
  → Result processing / asset attach
  → Job status (UI contract)
```

## Orchestrator API

| Function | Role |
|----------|------|
| `createGenerationJob` | Create or resume by idempotency key |
| `runSynchronousGenerationJob` | Lifecycle + chargeFinalized once |
| `getAuthorizedGenerationJob` | Owner-scoped poll |
| `failGenerationJob` / `markGenerationStorageFailure` | Safe failure (no recharge) |

Entry: `src/server/studio-generation/generation-orchestrator.ts`

## Credit lifecycle (decision)

**KEEP** existing `billProviderAction` / wallet reservation semantics.

Flow:

1. Create job (no charge)  
2. Authorize / reserve via existing APIs  
3. Provider execute  
4. Capture on success OR refund on failure/skip  
5. `chargeFinalized=true` at most once on the job  

No new reserve/refund policy in S.4.

## Idempotency

- Key: `Idempotency-Key` header or `clientMutationId` body  
- Unique: `(ownerId, idempotencyKey)`  
- Replay of succeeded job returns prior `outputAssetId` without re-charge  

## Scene target integrity

`sceneId` is stored on the job at creation. UI selection changes do not retarget in-flight jobs.

## First migration

`POST …/scenes/[sceneId]/images` creates a canonical job and runs billed generation through the orchestrator.

## Long-running / queue

Vercel `after()` + provider-hosted async remain. **No new queue vendor** in S.4 unless Preview proves necessity.
