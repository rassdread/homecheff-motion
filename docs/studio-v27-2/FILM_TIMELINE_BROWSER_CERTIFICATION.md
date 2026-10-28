# Film timeline in the browser

Project `cmvrdlbwg0005dh92s468jz8g`, signed in as user A. The timeline starts in simple mode. The certification switched it with `film-timeline-mode` (“Advanced”), which reveals the existing track editor. No second timeline engine was added.

Repeated certification runs had stacked clips because the client read `body.tracks` while the API returns `body.timeline.tracks`, so the “already uploaded” check always saw zero. The export pass then used the product remove button until four video clips and one music clip remained.

After that edit the timeline was:

| Track | Clips |
| --- | --- |
| VIDEO | 500–8000 ms (duration 7500), 8000–16000, 16000–24000, 24000–32000 |
| DIALOGUE | 500 ms, duration 3000 (uploaded `voice.wav`, upload HTTP 200) |
| MUSIC | 2000 ms, duration 30000 (upload HTTP 200) |
| SFX | 8000 ms, duration 1000 (upload HTTP 200) |

An earlier pass set the first clip start to 500 and trim-in to 200, reloaded the project, and read those values back (`timelineAfterReload.start = "500"`, `trim = "200"`). That start overlapped the next clip, so export correctly refuses overlapping pictures. The duration was then saved as 7500 through the clip form (“Clip saved”) so the pictures no longer overlap. The clock after the trim read `0:00 / 0:32`.

Upload notes are set only after the timeline save returns. A failed add no longer shows “Voice added”.

Audio duration probing now stops after 4 seconds if the browser never reports metadata, and the upload continues with a fallback duration. Headless playback had left the voice upload waiting forever.
