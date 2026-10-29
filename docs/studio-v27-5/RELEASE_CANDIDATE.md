# Release candidate

`dcd0caea75b6d08755c4431ceebc3eba651f10b7` is the V27.4 application commit. It is no longer the candidate. This task changed export behavior.

| Name | Commit |
|---|---|
| BASE_APPLICATION_COMMIT | `dcd0caea75b6d08755c4431ceebc3eba651f10b7` |
| V27_5_FINAL_APPLICATION_COMMIT | `8ffde5d7f349b63dc1ecaa0df6fec085cab0fd81` |
| V27_5_DOCUMENTATION_COMMIT | recorded after this file is committed |

## What `8ffde5d7` changes

- `src/server/studio/film-export-runtime.ts`
- Timeline render route: `maxDuration = 300`, and HTTP 503 before FFmpeg when the process is on Vercel and `VIDEO_RENDER_MODE=worker`
- Safe error text for `film_export_worker_required`
- `src/server/studio/studio-v275-film-export.test.ts`
- `package.json` test list

The clean checkout at that commit passed the local film browser certification. The Vercel function probe showed no FFmpeg binary. This commit is not a production release.

Not pushed. Not merged. Not deployed.
