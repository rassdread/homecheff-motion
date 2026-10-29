# Film job lifecycle

Verified against `c722b35b`.

1. The timeline UI posts `phase: start`. The route creates a `TIMELINE_EXPORT` job with `creditCost` 0 and `creditsCharged` 0.
2. The route checks the session and the project owner.
3. When `VIDEO_RENDER_MODE=worker` and the worker URL and secret are set, `rememberTimelineExportRequest` stores project id, revision, language, width, and height on the job.
4. `requestWorkerFilmTimelineRender` posts to the worker with the bearer secret. The body is `{}`. Timeout is 180 seconds.
5. The worker checks the secret, then loads the job.
6. A cancelled job returns without encoding. A succeeded job with a stored library asset returns that asset and does not encode again.
7. `executeOwnedFilmExport` loads the timeline, copies only attached media, and calls `renderTimelineFilm`.
8. `publishLibraryVideo` stores the MP4. The same source id does not upload twice.
9. The job is marked succeeded.
10. The route reads the library row only when `ownerId` matches, then returns the MP4 bytes.

The Vercel handler stays open until the worker responds. That matches instant premium. It is not a background queue. A second request while `FILM_EXPORT_RUNNING` contains the job id gets `{ ok: true, status: "running" }` without a file. The route treats a missing download URL as a failed response for that caller. It does not mark the in-flight job failed.

A worker crash leaves the job in `processing`. The running set is memory only. The next dispatch renders again. Credits stay 0. Partial files under the temp directory are removed in the `finally` of `executeOwnedFilmExport`.

Media larger than 80 MB is rejected. Width and height above 1920 are rejected by `renderTimelineFilm`.
