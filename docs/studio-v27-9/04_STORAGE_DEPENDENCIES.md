# Storage dependencies

Provider remains Vercel Blob through `uploadPublicBlob` in `publishLibraryVideo`. No second library was added.

`localMediaDir()` returns null when `NODE_ENV` is `production` or `BLOB_READ_WRITE_TOKEN` is set. The worker image sets `NODE_ENV=production`, so a production worker publish uses Blob, not `file://`.

Publication path: `production/{ownerId}/timeline_export/{sourceId}.mp4`. An existing https or file URL for the same owner, source kind, and source id is reused. Empty bytes throw before a row is completed. V27.8 recorded the local file success and the failed-upload failure. That evidence is PREVIOUSLY_CERTIFIED on commit `4880f888`. It is not a Blob test.

`BLOB_READ_WRITE_TOKEN` is present in the local production env copy dated 2026-09-12. There is no second, isolated token in the local env files. This pass did not upload.

`BLOB_CERTIFICATION = BLOCKED`

During a separately approved production check, after the worker is deployed and before any customer export:

1. Publish one synthetic MP4 with a disposable owner.
2. Read back the library row and confirm the owner.
3. Download as that owner and confirm another user receives 404.
4. Repeat the same source id and confirm one asset.
5. Force one failed upload and confirm the job is `failed`, not `succeeded`.
6. Remove the synthetic object and row in that same approved window.

Do not use customer media for that check.
