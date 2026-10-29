# Worker deployment scope

## Candidate

Runtime commit: `c722b35b8507b0d682aebf333b867667f8e9fa6b`.

`106300c5` adds these V27.6 documents only. It does not change worker behavior. Either commit builds the same worker process. The code commit to deploy is `c722b35b`.

## What the image contains

`Dockerfile.worker` has no ignore file beside it. `COPY . .` sends the whole tree. `npm ci` installs the full lockfile. `npx prisma generate` uses the full schema. The process that listens is still `npm run worker`.

This is not a sliced worker package. It is safe relative to Motion only because the instant-premium, language-export, and marketplace sources are identical to the live worker commit. It is not safe to describe as “the film route only.”

## Required at runtime

- Existing `VIDEO_WORKER_SECRET`, same value the Studio app sends
- `DATABASE_URL` for the worker database
- `BLOB_READ_WRITE_TOKEN` when `NODE_ENV=production`, because local file storage is off
- `FFMPEG_PATH=/usr/bin/ffmpeg` from the image
- The additive timeline tables before a film job can load a timeline

Existing Motion routes do not import the new timeline models. The new route does, through `getFilmTimeline`.

## Do not deploy the branch as the Studio app in the same step

The live worker does not have `/jobs/film-timeline`. The candidate app calls it when `VIDEO_RENDER_MODE=worker`. Shipping the app first makes film export fail. Shipping the worker first leaves that route unused until the app is updated. Motion jobs keep their current paths.
