# Film runtime limits

No product setting states a maximum film length, scene count, or concurrent export count.

Code ceilings on `c722b35b`:

| Limit | Value | Source |
|---|---|---|
| Worker HTTP wait | 180 seconds | `requestWorkerFilmTimelineRender` |
| Route `maxDuration` | 300 seconds | timeline render route. Not applied on the Render process |
| Picture segment encode | 120 seconds | `renderTimelineFilm` |
| Concat | 180 seconds | `renderTimelineFilm` |
| Audio trim | 60 seconds each | `renderTimelineFilm` |
| One source file | 80 MB | `executeOwnedFilmExport` |
| Frame size | 160 to 1920 on each side | `renderTimelineFilm` |
| Output sizes used by the UI | 720×1280 or 1280×720 | route |

Certified durations, from V27.6, not extended here:

- Local worker: 1 second, one picture, voice, music, and an effect
- In-process FFmpeg: 3 seconds, three pictures

Worker memory and temp disk were not measured. Live worker CPU and memory were not read.

A film whose encode exceeds the 180 second HTTP wait fails the waiting request even if the worker is still running. That is the synchronous contract shared with instant premium. A detached poll would be a later change to the existing job row. It was not added. The editor still expects the MP4 body, and no product limit says the current wait is too short for a supported film.

Do not claim support past the 1 second worker fixture and the 3 second in-process matrix.
