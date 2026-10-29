# Full-tree compatibility

Compared `4f6ca34a04873d39ed832a2b3f2dd0d52a4c37ca` to `4880f88844e0b3f2a8dcef1bec36eee4c210f3ae`.

The image copies the whole repository. The process that starts is still `npm run worker`.

Unchanged, including their relative-import closure (10 files, empty diff):

- `src/server/instant-premium/worker-job.ts`
- `src/server/instant-premium/language-export-worker-job.ts`
- `src/server/marketplace-video/run-marketplace-video-job.ts`
- `src/server/marketplace-video/marketplace-video-job.ts`
- `src/lib/video-ffmpeg-capability.ts`
- `src/lib/video-render-mode.ts`
- `src/lib/vercel-blob-config.ts`
- `src/worker/video-tools/resolve-worker-ffmpeg.ts`

`worker/video-worker.ts` adds `POST /jobs/film-timeline/:jobId/render` and a one-at-a-time drain. The instant-premium, language-export, and marketplace handlers are still the same functions. `package-lock.json` has no diff. Runtime dependencies in `package.json` have no diff.

`AnimationProject` has no schema diff. The instant-premium worker reads and updates that model only. New Prisma models are voice-catalog and timeline tables. Importing the film module does not query them. The listen-time drain reads `StudioGenerationJob`, which production already has (`20260808120000_studio_generation_job`).

`StudioScene.dialogueText` is already on production, so a new client that selects it does not require a new migration for Motion.

No compatibility repair was required. These routes were not executed on the live worker.
