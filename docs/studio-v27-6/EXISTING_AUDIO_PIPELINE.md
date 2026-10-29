# Existing audio pipeline

`src/lib/studio-audio-mix-ffmpeg.ts` mixes voice, music, and discrete sound effects with volume, fade, and ducking. `renderTimelineFilm` in `src/server/studio/studio-timeline-render.ts` trims each clip, calls `mixStudioAudioLayers`, then `muxStudioVideoWithMixedAudio`. Burned subtitles use `burnStoryTextOverlay`. SRT and VTT export stays in `exportFilmSubtitles`.

The film worker job calls `executeOwnedFilmExport`, which calls `renderTimelineFilm`. It does not add a second mixer.

The local worker test placed dialogue, music, and an effect and got one AAC stream. That is the existing mix, not three separate output tracks. No layer was dropped by a new code path. A longer film than the one-second fixture was not certified here. The earlier local matrix still covers a three-second picture sequence.
