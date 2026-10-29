# Production release sequence

Not authorized. Do not run it from this task.

The live worker stays on `4f6ca34a` until a separate approval. The live Studio app stays on its current deployment until a separate approval.

## Order

1. Re-read production `_prisma_migrations` and confirm the newest finished name is still `20261019153000_studio_scene_dialogue_text`.
2. Take the backup described in V27.5. Then apply only `20261020120000_studio_timeline`.
3. Deploy worker commit `c722b35b` to the existing Render service `homecheff-motion`. Do not create a second service. Confirm `GET /health` reports that commit and `GET /health/video` still reports `/usr/bin/ffmpeg`.
4. Confirm an existing Motion or instant-premium health path still answers. Do not send a customer job as the smoke test.
5. Deploy the Studio app at that same commit. `VIDEO_RENDER_MODE` stays `worker`. The app then calls `/jobs/film-timeline`.
6. Run one synthetic film on a non-production database and non-production blob before any customer export.

## Visibility

Step 2 is invisible to users. Step 3 is invisible until a client calls the new route. Step 5 is the external change: film export starts using the worker, and the rest of the unified app becomes the live Studio build. That step is the production release, not a worker-only change.

## Coexistence

Old worker plus current live app: current production behavior. The live app commit does not call the film route.

New worker plus current live app: Motion routes are unchanged in source. The film route is unused. This is the reversible window.

New worker plus new app, before the migration: film jobs fail on the missing table. Do not enter this window.

Old worker plus new app: film export calls a route that returns 404. Do not enter this window.

Each of steps 3 and 5 can be reversed by redeploying the previous artifact. Step 2 is not reversed by those redeploys. Leave the new tables in place.
