# Storage

Local `file://` publish through `publishLibraryVideo` succeeded for the 15, 30, and 60 second films and for the browser download. Repeat publication of the same source returned the same library row.

A read-only media directory made `publishLibraryVideo` throw. The job was marked `failed` with `storage` and was not reported as completed. The directory mode was restored. No production blob was written.

Production Blob and any isolated Blob store were not available. `BLOB_CERTIFICATION = BLOCKED`.

Download authorization is the owner check on `StudioLibraryAsset` plus `readOwnedTimelineDownload`. Another user received HTTP 404 in the browser.
