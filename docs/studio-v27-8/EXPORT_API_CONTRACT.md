# Export API

`POST /api/studio/projects/:projectId/timeline/render`

Worker mode returns JSON:

- HTTP 202 with `jobId`, `status` (`queued` or `processing`), and `statusUrl`
- HTTP 200 JSON when the same job already succeeded, with `downloadPath`
- It does not return a video body and does not invent a completed file

`GET` on the same route:

- Without `jobId`, the latest export for that owner and project
- With `jobId`, status, coarse `stage`, and `downloadReady`
- With `download=1`, the MP4 only when the job succeeded and the library row belongs to the caller

Another user's read returns HTTP 404. The browser certification observed that.

Local mode, used when `VIDEO_RENDER_MODE` is unset, still returns `video/mp4`. The editor accepts either a video response or a 202 job and then polls.

The editor keeps the same timeline controls. After a completed export it shows a download button, including after the user leaves the project and comes back.
