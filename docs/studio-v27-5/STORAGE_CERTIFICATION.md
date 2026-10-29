# Storage certification

## Production behavior in code

`localMediaDir()` returns null when `NODE_ENV=production` or `BLOB_READ_WRITE_TOKEN` is set. Production has a blob token, so `file://` media is off. `publishLibraryVideo` then uses the blob pathname `production/{ownerId}/{sourceKind}/{sourceId}.mp4`.

Ownership checks on the timeline route remain. The protected film id still returns 403. This task did not change those checks.

## What was executed

Local certification used `STUDIO_LOCAL_MEDIA_DIR` under the system temp directory and a local scene-image directory under the same temp root. The browser certification downloaded its MP4 from the local server. Wallet delta was 0.

No object was written to production blob storage. No isolated blob store was created. Signed URL expiry, blob cleanup, and a cloud download were not executed.

## Verdict

Code path for production storage: PRESENT.

Runtime proof of production-compatible blob upload and download: NOT EXECUTED.

`PRODUCTION_STORAGE_COMPATIBILITY` is therefore not PASS.
