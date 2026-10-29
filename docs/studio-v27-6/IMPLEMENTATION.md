# Implementation

Commit `c722b35b8507b0d682aebf333b867667f8e9fa6b`.

`resolveFilmExportRuntime` returns `external_worker` when `VIDEO_RENDER_MODE=worker`. It no longer also requires `VERCEL`. Local certification does not set the mode, so it still encodes in process.

The route, when worker mode is configured, writes the render options onto the existing `TIMELINE_EXPORT` job and calls `requestWorkerFilmTimelineRender`. The worker loads that job by id, ignores any client owner, refuses a non-zero credit cost, and calls `executeOwnedFilmExport`. That function is the same download, `renderTimelineFilm`, and `publishLibraryVideo` sequence the route used locally.

A succeeded job with a stored library asset returns that asset and does not encode again. A second in-flight call for the same job id gets `running`. An empty timeline fails the job and does not change the wallet.

The route then reads the library URL only if the row belongs to the session user. The response is still the MP4.

`maxDuration` stays 300. The worker HTTP timeout is 180 seconds, matching instant premium. Films longer than that wait are not certified.

Wizards, prices, and Motion routes were not edited.
