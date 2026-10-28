# Distinct library video

The existing library videos were local export files and were not used. A 6-second H.264 MP4 with a solid blue picture and a 660 Hz tone was created with local ffmpeg, uploaded through `POST /api/studio/orchestrator/upload-asset` (`kind=video`), and registered through `POST /api/studio/library/assets`.

| Field | Value |
| --- | --- |
| Media URL | `/api/studio/local-media/bd69cebc-1fc1-4784-ace9-c90fbda23d8f` |
| Library asset | `cmvscmlyh0001dht7b64pqhgv` |
| Title | V2731 distinct blue video |
| Family / type | `video` / `video/mp4` |
| Owner | `cmvrdb5a20000dhrzji8993h1` (user A) |
| Scene | `cmvrdnblh000bdh92jjl4bhrb` (scene 2) |
| Timeline clip | `cmvscmpws0003dht77kqmiv6e` |
| Clip placement | start `5000`, duration `3000` after the existing duration control |

The attach button `studio-v273-attach-asset-cmvscmlyh0001dht7b64pqhgv` was clicked in the scene library UI. Its label was the asset title. After refresh the clip was still `5000|6000` before trimming.

The scene still stayed `cmvs2dumh005mdh92vwmc9q45`. The model keeps the still and the timeline video separately, so both remain.

The new 6-second clip overlapped the video that started at `500`. That earlier clip was selected in the timeline and its duration was changed from `7500` to `4500` with `film-clip-duration`. The new clip was then set to `3000` so it ends at `8000`, where the next video begins. Export no longer reports an overlap.

At playhead `5500` the preview element `film-timeline-video` used the distinct media URL, `currentTime` `2124` ms, `readyState` 4, and was playing.

Export through `film-export-mp4` returned HTTP 200 and downloaded `V27.mp4` (`618886` bytes, H.264 720x1280, AAC, 32.040 s). The hash differs from the V27.3 export. The frame at 6 seconds is the blue picture, letterboxed in the 9:16 frame (`evidence/export-frame-6s.png`).

## Ownership

Signed in as user B:

| Check | Result |
| --- | --- |
| `GET` the media URL | 404 |
| Attach the asset to user A's scene | 404 |
| Asset present in user B's library list | no |
| User B film `cmvscq6zu0007dht75mwwil0t`, scene created, attach of A's asset | 404 |

User B's wallet was not charged. No production storage was used.
