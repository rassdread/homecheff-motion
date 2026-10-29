# Current film export

Before `c722b35b`, `POST /api/studio/projects/[projectId]/timeline/render` downloaded attached media and called `renderTimelineFilm` in the request. V27.5 made `VIDEO_RENDER_MODE=worker` on Vercel return HTTP 503, because that function has no FFmpeg and the worker had no film job.

The route still does not call `billProviderAction` or `requireStudioCredits`. Credit fields on the job stay 0.

The UI in `studio-project-timeline.tsx` still posts `phase: start`, then posts the render, and expects MP4 bytes. That contract was kept. Worker mode waits for the existing worker HTTP call, the same way instant premium does, then reads the stored file and returns it. The editor was not rewritten.

Local mode is unchanged in behavior: `VIDEO_RENDER_MODE` unset means the route calls `executeOwnedFilmExport` in process. The browser certification used that mode.
