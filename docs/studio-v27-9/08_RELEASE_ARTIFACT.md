# Release artifact

No application commit was created in V27.9.

| Piece | Commit |
| --- | --- |
| Studio application | `4880f88844e0b3f2a8dcef1bec36eee4c210f3ae` |
| Worker source | the same commit |
| Dockerfile | `Dockerfile.worker`, unchanged from `4f6ca34a` |
| Runtime | Node 20 in the image. Studio on Vercel was last recorded as Node 24.x. That project setting was not re-read. |
| Migration | `20261020120000_studio_timeline`, not applied |
| Worker start | `npm run worker` |

Do not deploy `c722b35b` with this worker. That app still expects the worker response to carry the finished MP4. This worker returns HTTP 202 and continues in the worker process.

Do not deploy the app at `4880f888` onto the live worker. The live worker has no film route, so the job fails with `worker_route_unavailable` instead of returning a video.

V27.8 evidence, not re-run, on `4880f888` during 2026-10-29: 5527 tests, production build, local browser download, and 15/30/60 second films. See `docs/studio-v27-8/`.

The docs commit `c98b98cf` is not a runtime artifact.
