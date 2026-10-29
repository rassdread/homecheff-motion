# Worker dispatch

VERIFIED on a local process of `worker/video-worker.ts` at commit `4880f88844e0b3f2a8dcef1bec36eee4c210f3ae`. The live Render service was not called with a job.

Measured accept time before FFmpeg finished:

| Film | HTTP accept |
| --- | --- |
| 15s | 6 ms, HTTP 202 |
| 30s | 4 ms, HTTP 202 |
| 60s | 4 ms, HTTP 202 |

The handler sends 202 after the database claim and before `runFilmTimelineWorkerRender`. The render continues in the worker process. This is the same shape as `POST /jobs/marketplace-video/:jobId/process`.

The Studio function does not start FFmpeg in an unawaited promise. If the worker cannot be reached, the job stays `queued` and a later status read tries the accept again. A missing route (HTTP 404) fails the job with `worker_route_unavailable` instead of reporting a finished film.

Live health on 2026-10-29, read only:

- `GET /health` HTTP 200, commit `4f6ca34a04873d39ed832a2b3f2dd0d52a4c37ca`
- `GET /health/video` HTTP 200, `ffmpegPath` `/usr/bin/ffmpeg`
- That commit does not contain the film route. No job was posted.
