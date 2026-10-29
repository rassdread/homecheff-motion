# Original Motion pipeline

This is the path already in the tree. It was not modified.

1. `POST /api/animations/projects` calls `requireStudioCredits` with `motion_render` before create.
2. `POST /api/animations/projects/[id]/jobs/start` states that `motion_render` was charged at create and must not charge again. It tracks the Vidu job.
3. When `VIDEO_RENDER_MODE=worker`, instant premium calls `requestWorkerInstantPremiumProcess` in `src/lib/video-worker-client.ts`.
4. The worker authenticates `Authorization: Bearer` against `VIDEO_WORKER_SECRET`, then `runInstantPremiumWorkerProcess`.
5. That calls `executeInstantPremiumMerge`, which uses the poster compositor and `final-assembly.ts` for concat and overlay.
6. Output is stored with the existing blob configuration. The route returns status. A second request while `RUNNING` has the project id returns `running` instead of starting another encode.
7. Retry overlay is `POST /jobs/instant-premium/:projectId/retry-overlay`.

Other worker jobs already on the same process: language export (`runLanguageExportWorkerRender`) and marketplace video (`executeMarketplaceVideoJob`, HTTP 202). There is no separate queue process. The worker is the job system: one Express server, in-memory running sets, and database rows.

The film timeline does not use the Vidu provider. It reuses the worker process, the FFmpeg binary, and the library publish path.
