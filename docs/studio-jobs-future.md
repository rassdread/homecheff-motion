# Studio — Background jobs (V15) and future worker queue

## V15 (implemented)

`StudioJob` rows persist bulk Studio work with progress, per-scene results, and audit fields in `resultJson`.

Job types:

- `generate_scene_images`
- `analyze_consistency`
- `analyze_vision`
- `improve_weak_scenes`

The API creates a job (`queued`), returns immediately, and runs the runner via Next.js `after()` so the HTTP request does not block on every scene. The storyboard editor polls `GET …/jobs/[jobId]` every few seconds until the job completes, fails, or is cancelled.

Partial failure: one scene error does not stop the job unless every scene fails.

## Future migration (not required for V15)

```
StudioJob (DB)
    ↓
Worker queue (BullMQ / SQS / dedicated worker process)
    ↓
studio-job-runner (same step functions)
    ↓
Realtime events (SSE / WebSocket) optional
```

Keep `runStudioJob(jobId)` as the single orchestration entry point so the runner can move off the web process without changing UI contracts.
