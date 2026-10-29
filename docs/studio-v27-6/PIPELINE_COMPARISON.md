# Pipeline comparison

| Step | A. Motion | B. Studio assembly | C. Film timeline before | C. Film timeline now |
|---|---|---|---|---|
| Entry | Animation project create and job start | Instant premium and language export routes | Timeline render route | Same route |
| Auth | Studio session and credit gate | Session, then worker bearer secret | Session and owner check | Session, then the same worker secret |
| Billing | `motion_render` at create | Existing action prices | None | None |
| Job | Animation job and worker `RUNNING` set | Worker `RUNNING` or language-export set | `StudioGenerationJob` `TIMELINE_EXPORT` | Same row, `executionMode: worker` |
| Worker | `POST /jobs/instant-premium/:id/process` | Language export or marketplace route | None | `POST /jobs/film-timeline/:jobId/render` |
| FFmpeg | Worker binary via merge and final assembly | Same worker | In-process `renderTimelineFilm` | Same `renderTimelineFilm` on the worker |
| Audio | Provider audio inside the motion merge | `mixStudioAudioLayers` where those routes use it | `mixStudioAudioLayers` | Same mixer, called from the worker |
| Storage | Blob from the worker | Blob or library | `publishLibraryVideo` | Same publish |
| Retry | `retry-overlay`, in-memory running guard | Same | New job id per click | Repeat of a succeeded job returns the stored asset |
| Download | Existing animation download | Existing | MP4 body | MP4 body after an owner check |

## Classification

- SHARED_COMPONENTS: video worker process, worker bearer auth, FFmpeg, `renderTimelineFilm`, `mixStudioAudioLayers`, `publishLibraryVideo`, `StudioGenerationJob`
- DUPLICATED_COMPONENTS: none added. The in-process encoder remains the local-mode path.
- DISCONNECTED_COMPONENTS: the May worker and the October timeline. Connected by the film job.
- MISSING_ADAPTERS: the film job payload is the existing job id plus metadata (`projectId`, revision, size, language). No second queue.
- ACTUAL_MISSING_CAPABILITIES: the live worker commit `4f6ca34a` does not contain the new route. A worker deploy is still required before production can run it.
- UNVERIFIED_RUNTIME_DEPENDENCIES: live H.264 and AAC were not probed. Vercel deployment id was not re-read (API 403).

The component that should execute the film export is the existing `homecheff-motion` Render worker, through `runFilmTimelineWorkerRender`.
