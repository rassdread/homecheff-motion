# Asynchronous export

The film export no longer waits inside the Studio request for FFmpeg.

When `VIDEO_RENDER_MODE=worker`:

1. The Studio route authenticates the user and checks project ownership.
2. It stores a `TIMELINE_EXPORT` row on `StudioGenerationJob` with `creditCost` 0, `metadata.async` true, and status `queued`.
3. It calls the existing worker `POST /jobs/film-timeline/:jobId/render` with the existing bearer secret. The body is empty. The timeout is 15 seconds.
4. The worker claims the row and returns HTTP 202. The Render process is long-lived, the same process that already returns 202 for marketplace video and continues `executeMarketplaceVideoJob` after the response.
5. FFmpeg runs after that response, through the existing `executeOwnedFilmExport`, `renderTimelineFilm`, `mixStudioAudioLayers`, and `publishLibraryVideo`.
6. The editor polls `GET /api/studio/projects/:projectId/timeline/render?jobId=`.
7. The MP4 is downloaded from the same route with `download=1`, only for the owning user.

Local certification still returns the MP4 body when `VIDEO_RENDER_MODE` is unset. That path is the long-running local Node process, not the production worker path.

No second queue, worker, or billing system was added. The job row is the queue. One film render runs at a time (`FILM_EXPORT_CONCURRENCY = 1`). A second job stays `queued` and the worker starts it when the slot is free, including after a restart.
