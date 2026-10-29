# Database compatibility

No new migration was added. The asynchronous job uses existing `StudioGenerationJob` columns: `status`, `attempt`, `maxAttempts`, `outputAssetId`, and `metadataJson`.

The film render still reads `StudioTimeline` through `getFilmTimeline`. The additive migration `20261020120000_studio_timeline` is still required before a film job can load. It was not applied to production. Production migration state was not re-queried in this pass. V27.4 reported that migration as the one production lacked. That remains HISTORICALLY_REPORTED.

The worker can boot before the migration. A film job fails when the timeline tables are missing. Instant-premium, language-export, and marketplace routes do not read those tables.

Order derived from the code:

1. Apply `20261020120000_studio_timeline` on a confirmed backup.
2. Deploy the worker at `4880f88844e0b3f2a8dcef1bec36eee4c210f3ae` to the existing Render service.
3. Deploy the Studio app at the same commit.

The new app against the old worker gets HTTP 404 from the missing film route and fails the job. It does not return a fake MP4. The current live app does not call the film route, so the new worker does not change existing Motion traffic before the app deploy.
