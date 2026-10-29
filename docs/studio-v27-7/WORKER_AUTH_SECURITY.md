# Worker authentication

`requireWorkerAuth` in `worker/video-worker.ts` compares `Authorization` to `Bearer` plus `VIDEO_WORKER_SECRET`. A missing secret returns 503. A mismatch returns 401. The film route uses that middleware. No second auth system was added.

Local process on `127.0.0.1:8091`, secret `local-film-worker-test`, disposable database, commit `c722b35b`:

| Request | Result |
|---|---|
| Film route with no header | 401 `Unauthorized` |
| Film route with the wrong bearer | 401 `Unauthorized` |
| Film route with the test secret and job id `missing` | 404 `not_found` |
| Instant-premium route with no header | 401 `Unauthorized` |

`runFilmTimelineWorkerRender` loads the job by id and `capability = TIMELINE_EXPORT`. It uses `ownerId` from that row. The request body is ignored. A non-zero `creditCost` or `creditsCharged` returns `billing` and does not render.

The Next route checks the session owner before it calls the worker. A browser client does not receive the worker secret.

FFmpeg arguments are built inside `renderTimelineFilm` from timeline fields. The worker does not pass client strings through a shell. `shell: false` is the existing spawn.

The 401 body is `{"error":"Unauthorized"}`. It does not include the secret.

This local probe is not the live service. No live job was sent.
