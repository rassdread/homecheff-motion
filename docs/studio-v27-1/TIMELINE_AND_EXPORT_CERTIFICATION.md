# Timeline and export certification

## Decision layer

`assembleVisualPieces` accepted three clips at 0s, 10s, and 20s and returned 30000 ms with no black gaps.

`buildTimelineMixRequest` placed `music.wav` on the music bed, ducked it under narration, and kept `voice.wav` and `sfx.wav` as discrete cues.

`applyClipPatch` moved a clip. `trimEdge` shortened it to 7000 ms. `sameRevision(4, 4)` was true and `sameRevision(4, 3)` was false. `advancePlayhead` moved from 0 to 1000 ms without ending. `audibleClip` was true for the voice file.

Transitions are not a field on this timeline adapter. None were reported as working.

## Local file

`renderTimelineFilm` was run with local ffmpeg (`/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg`). Inputs were lavfi color clips and sine waves, not provider output.

Output: `/var/folders/dr/r146hbbd7fld0ld1txvtrl7c0000gn/T/studio-v27-1-1793144092303/film.mp4`

ffprobe:

- duration `30.000000`
- size `561378` bytes
- video `h264`
- audio `aac`
- renderer result `durationMs: 30000`

The file is a real local render of synthetic media. It is not an export row, not a download from the product UI, and not a paid cloud render.

Playback was verified by ffprobe stream and duration. A browser `<video>` play-through was not performed.

## Export gap

The product export screen creates a job through the existing server path. That path was not called. There is no database in this worktree, so an export status record was not created and a product download button was not exercised.
