# Storage and rendering

Local certification stored scene images as `file://` under the temp directory because `STUDIO_SCENE_IMAGE_LOCAL_DIR` was set and `VERCEL` was unset. `localSceneImageDir()` returns null when `VERCEL` is set or `NODE_ENV` is production, and the image path then calls `uploadPublicBlob`. `localMediaDir()` returns null when `NODE_ENV` is production or `BLOB_READ_WRITE_TOKEN` is non-empty. Production has a blob token, so the local `file://` branch is off.

`publishLibraryVideo` writes the MP4 to blob pathname `production/{ownerId}/timeline_export/{sourceId}.mp4` when the local directory is off. The browser download in the route is the function response body, with `Content-Disposition: attachment`.

Production configuration that is present: `BLOB_READ_WRITE_TOKEN`, `FFMPEG_PATH`, `FFMPEG_FONT_PATH`. Values were not printed. Existing production routes such as the instant rebuild set `maxDuration` from 30 to 300. Those routes are already serving the live domain.

The new film route `src/app/api/studio/projects/[projectId]/timeline/render/route.ts` does not set `maxDuration`. `vercel.json` only sets region `fra1`. The platform default duration was not measured. The certification FFmpeg binary was `/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg` on this Mac, not the production `FFMPEG_PATH`.

Production rendering of the new film export is not proven. Storage selection for production is the existing blob path, and the token is configured, but no production object was uploaded.

`VERCEL_SUPPORT_LARGE_FUNCTIONS` exists on production and was not decrypted.
