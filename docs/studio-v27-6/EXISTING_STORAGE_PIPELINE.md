# Existing storage pipeline

`publishLibraryVideo` writes one library row per owner, source kind, and source id. A second call with the same key returns the existing row and does not upload again.

When `STUDIO_LOCAL_MEDIA_DIR` is set and `NODE_ENV` is not production and no blob token is set, the file is stored as `file://` under that directory. Otherwise it uses `uploadPublicBlob` at `production/{ownerId}/timeline_export/{sourceId}.mp4`.

The film route returns bytes only after `readAuthorizedExportBytes` finds that library row for the same owner and the same URL. Allowed reads are a path inside the configured local root, an owned certified local file, or `https://blob.vercel-storage.com`. Other URLs are refused.

No production blob object was written. The local worker test stored one `file://` asset and the repeat call kept that single row.

Historical Motion videos stay on their existing animation and blob records. This task did not read or change production media.
