# Studio Generation Orchestration (S.4)

**Status:** CANONICAL (S.4D–G completion slice)  
**Depends on:** S.1 credit SSOT, S.2 workspace, S.3 generation UX chrome

## Pipeline

```
User intent
  → Studio Generation Request (API)
  → createGenerationJob (idempotent)
  → Orchestrator
  → Provider Adapter (or billed sync body)
  → Result processing / asset attach
  → Job status (UI contract)
```

## Orchestrator API

| Function | Role |
|----------|------|
| `createGenerationJob` | Create or resume by idempotency key |
| `runSynchronousGenerationJob` | Sync lifecycle + chargeFinalized once |
| `beginAsyncGenerationJob` | Async accept: providerJobId + generating |
| `refreshAsyncGenerationJob` | Poll adapter → canonical status (no second start) |
| `technicalRetryGenerationJob` | Same paid attempt (storage recovery) |
| `retryGenerationJobAsNewAttempt` | New paid attempt (new idempotency key) |
| `requestGenerationJobCancellation` | Honest cancel or unsupported |
| `getAuthorizedGenerationJob` | Owner-scoped poll |
| `failGenerationJob` / `markGenerationStorageFailure` | Safe failure (no recharge) |

Entry: `src/server/studio-generation/generation-orchestrator.ts`

## Live adapter / route coverage

| Capability | Route | Mode | Adapter / body |
|------------|-------|------|----------------|
| IMAGE_GENERATE | `POST …/scenes/[sceneId]/images` | sync | billed `generateStudioSceneImage` |
| VOICE_TTS | `POST …/storyboards/[id]/voice` | sync | billed `generateStoryboardVoice` |
| VIDEO_GENERATE | `POST …/animations/.../jobs/start` | async_poll | `vidu_motion` adapter |
| FUSION_RENDER | `POST …/editor/fusion/render` | sync | billed `executeFusionWizardRender` |
| RENDER | Motion / render-batch | linked | prerequisites + Motion job link |

## Credit lifecycle (decision)

**KEEP** existing `billProviderAction` / wallet reservation semantics.

Flow:

1. Create job (no charge)  
2. Authorize / reserve via existing APIs  
3. Provider execute  
4. Capture on success OR refund on failure/skip  
5. `chargeFinalized=true` at most once on the job  

**Video note:** `motion_render` credits are charged at Motion project create. The VIDEO_GENERATE job tracks execution and must not create a second charge (`chargeOnThisJob: false` in metadata).

## Retry semantics (do not mix)

| Concept | Meaning | API |
|---------|---------|-----|
| Technical retry | Same paid attempt; reprocess/reattach | `POST …/generation-jobs/[id]/recover` |
| New generation | New paid attempt | New `Idempotency-Key` |

## Cancellation

- Supported only when capability/adapter `supportsCancellation=true` (fake harness).  
- Vidu motion: `supportsCancellation=false` — API returns `CANCEL_UNSUPPORTED` after acceptance.  
- Never map cancel to fake SUCCESS/FAILED.

## Resume / refresh

- Same idempotency key resumes in-flight job.  
- `GET /api/studio/generation-jobs/[jobId]` refreshes async status without restarting provider.  
- Client poller: `pollStudioGenerationJobUntilTerminal` (backoff, abort, stop on terminal).

## Scene / project target integrity

- Scene-scoped: `sceneId` frozen at create.  
- Project voice: `storyboardId` + language frozen in `inputSnapshotJson`.  
- Video: `animationProjectId` + `studioSourceStoryboardId` frozen; completion cannot attach to a different scene/project.

## Legacy StudioJob strategy

| Path | Strategy |
|------|----------|
| Bulk multi-scene `StudioJob` | **ADAPT** — keep UI batch; bill per step; do not remove until parity proven |
| Canonical `StudioGenerationJob` | **MIGRATE** — image/voice/video start/fusion |
| Motion transitions | **ADAPT** — providerJobId remains native; UX via GenerationJob + adapter |

## Long-running / queue

Vercel request returns job id quickly for video start. Polling via canonical job + existing `pollProjectJobs`. **No websocket infra** in S.4.
