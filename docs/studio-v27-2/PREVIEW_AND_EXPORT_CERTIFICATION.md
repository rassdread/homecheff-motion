# Preview and export

## Preview

On the signed-in timeline, `film-timeline-play` started the preview video. The media element reported:

| Field | Value |
| --- | --- |
| paused | false |
| readyState | 4 (`HAVE_ENOUGH_DATA`) |
| currentTime | 0.007318 |
| duration | 8 |

Seek wrote `data-ms="4000"` on `film-timeline-clock`. The video element is muted. Separate audio objects drive the mix. The audio marker string showed one video cue on and the music and effect cues off at the sampled instant, so this is not proof that the music bed was audible for the whole film.

A later play click, taken immediately after the timeline refresh, only reached `readyState` 1. The successful media event is the earlier one.

## Product export

`film-export-mp4` posted `phase: "render"` to `/api/studio/projects/cmvrdlbwg0005dh92s468jz8g/timeline/render`.

| Field | Value |
| --- | --- |
| HTTP status | 200 |
| Content type | `video/mp4` |
| Browser download event | `V27.mp4` |
| Saved file | `docs/studio-v27-2/evidence/v272-film.mp4` |
| Size | 593238 bytes |
| Duration | 32.040000 seconds |
| Video | h264 |
| Audio | aac |

ffprobe read that downloaded file. The renderer is the existing local ffmpeg path. No wallet charge and no provider call. The first export attempt waited 180 seconds with no download because the stacked clips overlapped and the test only listened for a download event. After the overlap was removed in the timeline UI, the product button produced the file above.

Local media is copied from `STUDIO_LOCAL_MEDIA_DIR` before any HTTP fetch, so the render request does not call back into the same dev server.
