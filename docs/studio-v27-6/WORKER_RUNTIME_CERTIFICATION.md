# Worker runtime certification

| Check | Result |
|---|---|
| Live `GET /health/video` | PASS, HTTP 200, FFmpeg present, drawtext present, commit `4f6ca34a` |
| Live film job | NOT_TESTED. Posting a job would use the production database and blob token. The live commit also has no film route. |
| Local worker film job | PASS. See `LOCAL_CERTIFICATION.md`. |
| Live worker modified | NO |
| Live worker restarted | NO |
| Worker environment changed | NO |

`ACTUAL_RENDER_RUNTIME_CERTIFICATION` = `LIVE_WORKER_READ_ONLY_VERIFIED` for FFmpeg health, and `LOCAL_PASS` for the film job. It is not a live film encode.

H.264 and AAC were measured on the local worker output. They were not measured on the live worker.
