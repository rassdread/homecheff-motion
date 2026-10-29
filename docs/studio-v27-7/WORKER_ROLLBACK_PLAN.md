# Worker rollback plan

Not executed.

## Known live point

- Commit reported by the worker itself: `4f6ca34a04873d39ed832a2b3f2dd0d52a4c37ca`
- Service: `homecheff-motion` at `homecheff-motion.onrender.com`
- Render deployment id: UNVERIFIED
- Docker image digest: UNVERIFIED
- Expected recovery time: UNVERIFIED

## Procedure, after an approved worker deploy

1. Redeploy the existing Render service at commit `4f6ca34a`. Do not create a new service.
2. `GET /health` must show that `sourceCommitSha`.
3. `GET /health/video` must still report `ok: true` and `/usr/bin/ffmpeg`.
4. Do not post a render job to prove the rollback.

If the Studio app was also moved, roll the app back separately. The last recorded app deployment is `dpl_5P4UM9K9bdZzg2ZZM2cegi2ZNsCq`. The Vercel API returned 403 here, so confirm that id before using it.

Rolling the worker back does not drop tables. If the timeline migration was applied, leave `StudioTimeline`, `StudioTimelineTrack`, and `StudioTimelineClip`. The previous worker does not read them.

A database restore is a different approval. It is not part of worker rollback.
