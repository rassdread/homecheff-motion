# Database dependencies

The film job reads `StudioGenerationJob` and then `getFilmTimeline`, which reads `StudioTimeline`, `StudioTimelineTrack`, and `StudioTimelineClip`. It publishes through `StudioLibraryAsset`.

`StudioGenerationJob` and `StudioLibraryAsset` come from migrations that predate the timeline migration. The timeline tables come only from `20261020120000_studio_timeline`.

V27.4 reported production applied through `20261019153000_studio_scene_dialogue_text` and did not have `StudioTimeline`. That was not re-queried. Classification: HISTORICALLY_REPORTED.

The schema diff from the live worker commit `4f6ca34a` to `c722b35b` also adds voice-catalog models and `StudioScene.dialogueText`. Those migrations sit before `20261020120000` and were reported as already applied on production. The new Prisma client will select `dialogueText` if a query loads `StudioScene` without an explicit select. That is safe only while production still has that column.

## Order derived from the code

1. Apply `20261020120000_studio_timeline` on production. The current live worker and the current live app do not read those tables, so they keep running. This step is not authorized here.
2. Deploy the worker at `c722b35b`. Old routes do not need the new tables. The film route does.
3. Deploy the Studio app that dispatches film export. Do this after the worker has the route.

The worker process can boot before the migration, because the timeline query runs inside the film job, not at listen time. A film job before the migration fails when Prisma cannot find the table. Do not deploy the app until both the migration and the worker route are in place.

No migration was applied.
