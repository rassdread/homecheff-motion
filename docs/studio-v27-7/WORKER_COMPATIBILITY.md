# Worker compatibility

Compared `4f6ca34a` with application commit `c722b35b`.

Files with no diff in that range:

- `Dockerfile.worker`
- `render.yaml`
- `src/server/instant-premium`
- `src/server/marketplace-video`
- `src/server/animation-export`
- `src/worker`
- `src/lib/ffmpeg`
- `src/lib/video-ffmpeg-capability.ts`
- `src/lib/vercel-blob-config.ts`

`package.json` changes the `test` script only. The `worker` script and dependency versions are unchanged.

`worker/video-worker.ts` adds one route and its in-memory set. Existing registrations stay:

| Route | Result |
|---|---|
| `GET /health` | UNCHANGED |
| `GET /health/video` | UNCHANGED |
| `GET /health/vision` | UNCHANGED |
| `POST /vision/detect` | UNCHANGED |
| `POST /jobs/instant-premium/:projectId/process` | UNCHANGED |
| `POST /jobs/instant-premium/:projectId/retry-overlay` | UNCHANGED |
| `POST /jobs/language-export/:exportId/render` | UNCHANGED |
| `POST /jobs/marketplace-video/:jobId/process` | UNCHANGED |
| `POST /jobs/film-timeline/:jobId/render` | New. Uses the same `requireWorkerAuth` bearer check |

Authentication, startup command, FFmpeg path, and blob helper source are unchanged. Billing code in the worker is unchanged. The film job refuses a non-zero `creditCost` or `creditsCharged`.

No breaking change was found in the existing route handlers. The Docker build still copies the whole repository, so the image contains the rest of the branch even though those handlers did not change.
