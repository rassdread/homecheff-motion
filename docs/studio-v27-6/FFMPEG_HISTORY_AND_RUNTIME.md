# FFmpeg history and runtime

## Where it was installed

`Dockerfile.worker` uses `node:20-bookworm` and `apt-get install ffmpeg fonts-dejavu-core`. It sets `FFMPEG_PATH=/usr/bin/ffmpeg` and the DejaVu font path. That image is the worker, not the Vercel function.

The app resolver still refuses `ffmpeg-static` in Next routes. The worker may use `ffmpeg-static` only through `src/worker/video-tools/resolve-worker-ffmpeg.ts`, and only when `FFMPEG_PATH` is unset. The Docker image sets the system binary, so the static package is not the production path.

## What V27.5 proved

An isolated Vercel function had no `ffmpeg` binary. That function is a different machine from Render.

## What this task verified

The live worker health check ran FFmpeg far enough to report drawtext and a readable font. H.264 and AAC on that live process were not probed, because a probe encode would be a job. The local worker test, using the same job code and Homebrew FFmpeg, produced H.264 and AAC.

No second FFmpeg was installed.
