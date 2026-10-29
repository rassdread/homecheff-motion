# Film render architecture

## What the route does

`src/app/api/studio/projects/[projectId]/timeline/render/route.ts` is a synchronous route. It loads media that is already attached to the project, calls `renderTimelineFilm`, publishes the MP4, and returns the bytes with an attachment disposition. It does not call `billProviderAction` or `requireStudioCredits`.

`renderTimelineFilm` spawns FFmpeg with `shell: false`. Segment timeout is 120 seconds, concat 180 seconds, copy 60 seconds. The app build rejects `ffmpeg-static` in the application bundle. Binary resolution is `FFMPEG_PATH`, then `/usr/bin/ffmpeg`, `/usr/local/bin/ffmpeg`, Homebrew paths, then `ffmpeg` on `PATH`.

The existing video worker (`VIDEO_RENDER_MODE=worker`, host `homecheff-motion.onrender.com`) serves other video jobs. It has no film-timeline job. This task did not deploy that worker and did not send it a job.

## Production execution model

An isolated Vercel function, Node v24.21.0, linux x64, has no FFmpeg binary. A stock `FFMPEG_PATH` therefore cannot encode inside the function. Adding `maxDuration` does not create a binary.

The smallest safe change is fail-closed:

- `resolveFilmExportRuntime` returns `external_worker` only when `VERCEL` or `VERCEL_ENV` is set and `VIDEO_RENDER_MODE=worker`.
- The route then returns HTTP 503, code `film_export_worker_required`, before creating a temp directory or spawning FFmpeg.
- Otherwise, including local certification, it still renders with local FFmpeg.
- The route exports `maxDuration = 300`, matching the existing long video routes. That value was not executed on Vercel.

Local certification does not set `VERCEL`, so the browser certification still encodes locally.

## What was not chosen

Bundling `ffmpeg-static` is forbidden by the app check. A new external worker was not introduced. The production Render service was not changed. A successful local encode is not a Vercel encode.
