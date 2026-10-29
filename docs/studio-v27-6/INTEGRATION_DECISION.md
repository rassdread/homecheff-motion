# Integration decision

1. Render infrastructure: service `homecheff-motion`, health verified, FFmpeg present.
2. FFmpeg: `/usr/bin/ffmpeg` in `Dockerfile.worker` and on the live health response. Not the Vercel function.
3. Audio: `mixStudioAudioLayers`, already used by `renderTimelineFilm`.
4. Storage: `publishLibraryVideo`.
5. Jobs: the worker’s Express routes and `StudioGenerationJob`. No separate queue.
6. Missing integration: the worker had no film-timeline route, and the film route encoded in the app process.
7. Minimum change: add `POST /jobs/film-timeline/:jobId/render` and dispatch from the existing route when `VIDEO_RENDER_MODE=worker`.
8. Risks: deploying the app without the worker leaves production export calling a route the live worker does not have. The worker uses the production database when it is the live service, so this task did not post a job there. In-flight cancel still depends on the job status check at the start of the render.
9. Tests: local worker process on `127.0.0.1:8091`, disposable database, synthetic media. Browser certification stays on local mode.
10. Cost: no new service, no new database, no paid provider. A later worker deploy uses the existing Render service.

Choice: REUSE_EXISTING_WORKER, EXTEND_EXISTING_JOB_TYPE, REUSE_EXISTING_STORAGE, REUSE_EXISTING_AUDIO_PIPELINE.

No new infrastructure was created.
