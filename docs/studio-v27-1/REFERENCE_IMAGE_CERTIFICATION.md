# Reference image certification

## What was proven

A 1×1 PNG (67 bytes, header `0x89`, footer `0x82`) was staged with owner `user-a`, project `film-1`, and scene `scene-2`.

`readStagedStudioImage("user-b")` and `readStagedStudioImage(null)` returned null. The same owner received the bytes.

Those bytes were identified and the reference URL `https://studio.local/references/upl-kitchen` was passed through the existing `pickReferenceUrlsForStillAdapter`. The adapter returned two references, logo before the staged character image. `characterMasterBlocked` was false because the picked URLs included that reference.

The homepage file input calls `persistStagedStudioImage`. The photo-video composer, after auth resolves and while the composition is empty, loads that record and passes a `File` into the existing `onFiles` path. Allowed types are jpeg, png, and webp, matching `POST /api/uploads/images`.

## What was not proven

`POST /api/uploads/images` was not called. This worktree has no `BLOB_READ_WRITE_TOKEN` and no signed-in user. The file did not reach Vercel Blob, and it did not reach `createStartEndVideoJob`. The still-adapter unit boundary is the evidence. A live provider payload was not sent.

IndexedDB persistence is implemented for the browser. The unit test used the in-memory store because Node has no `indexedDB`. A browser upload of the PNG through the homepage into the photo-video strip was not completed in this pass.

Refresh survival inside the photo-video composer still depends on the existing draft save. The staged handoff is reapplied when the composition is empty.
