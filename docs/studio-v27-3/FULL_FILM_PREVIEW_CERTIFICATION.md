# Full film preview

The timeline already on this disposable film is about 32 seconds. Playback was started with a click on `[data-testid="film-timeline-play"]`. The video element is muted by the existing player. The mix is separate `Audio` objects. The probe is `[data-testid="film-timeline-audio"]`.

## First play

From `evidence/workflow-report.json`, about 2.5 seconds after play:

- `mixMuted` `0`, `mixPaused` `0`, `mixVolume` `1`
- Music stem position `451` ms, volume 35, not muted
- Clock after a seek near the end and another play: `0:32 / 0:32`, `data-ms` `31825`
- Video `readyState` `4`
- `decodeAudioData` on the active mix URL: RMS `0.088`, 384000 samples, HTTP 200

## Scene 2 window

`evidence/followup-report.json` seeked to 5600 ms and played again.

- Clock `0:07 / 0:32`, `data-ms` `6815`
- Markers at that position: one VIDEO on, one DIALOGUE on, two MUSIC on, one SFX on
- All of those active stems report `open` rather than `muted`
- Active mix URL decoded to RMS `0.088` over 8 seconds, HTTP 200
- Element `currentTime` on the first active object was still `0` at the sample

The timeline clock moved into the scene that holds the new voice, music, and sound effect, and those tracks were the active unmuted stems. The audio element's own clock did not advance in that sample, so this is not a recording of three distinct tones from the output device. The decoded file behind the active mix URL is not silent.

Screenshot: `evidence/timeline-preview-1440.png`.

## Export and download

User A clicked `[data-testid="film-export-mp4"]` on the same timeline. Playwright saved the browser download as `evidence/v273-film.mp4`. Suggested filename `V27.mp4`.

`ffprobe` (`evidence/export-report.json`):

- duration `32.040000` seconds
- size `618886` bytes
- video `h264` 720×1280
- audio `aac`

`ffmpeg` decoded a frame at 7 seconds (`evidence/export-frame-7s.png`) and measured the audio stream: mean volume `-36.4 dB`, max `-25.7 dB`, `1412096` samples. That is the assembled file, not digital silence. Wallets stayed `500/0`, `100/0`, and `0/0`.
