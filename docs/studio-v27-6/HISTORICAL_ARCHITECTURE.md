# Historical architecture

Git history on this repository. A file existing in history is `CURRENT_CODE_PRESENT` or `HISTORICALLY_REPORTED_WORKING` only when a commit message or a live check says so. Runtime checks are listed separately.

| Component | Introduced | Current file | State |
|---|---|---|---|
| Animation jobs and export APIs | `889bdd88` 2026-04-26 | `src/server/animation-jobs/service.ts` and animation routes | CURRENT_CODE_PRESENT. This task did not re-run a Vidu job. |
| Poster compositor and final concat | `e44f101e` 2026-05-20 | `src/server/instant-premium/poster-motion-compositor.ts`, `final-assembly.ts` | CURRENT_CODE_PRESENT. Used by instant-premium merge. |
| FFmpeg worker | `c86ef24b` 2026-05-20, “delegate locked text video rendering to ffmpeg worker” | `Dockerfile.worker`, `worker/video-worker.ts` | CURRENT_CODE_PRESENT and CURRENT_RUNTIME_VERIFIED for health. The live process is commit `4f6ca34a` (2026-10-07). |
| Instant-premium merge | same May worker line | `executeInstantPremiumMerge` in `src/server/instant-premium/merge-instant-project.ts` | CURRENT_CODE_PRESENT. Called by `runInstantPremiumWorkerProcess`. |
| Unified film timeline | `aa621157` 2026-10-26 | `src/server/studio/studio-timeline-render.ts` | CURRENT_CODE_PRESENT. It called FFmpeg inside the app and did not call the worker. |
| V27.5 fail-closed 503 | `8ffde5d7` 2026-10-29 | `resolveFilmExportRuntime` | Replaced in `c722b35b`. The 503 remains only when worker mode is set and the worker URL or secret is missing. |

The film timeline was added in October on top of a worker that had been encoding since May. The missing piece was a job type, not a new renderer.
