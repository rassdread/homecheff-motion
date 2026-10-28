# Browser audio certification

Mechanism: one `HTMLAudioElement` per audible timeline clip. The picture element is muted. This is `AUDIO_ELEMENT_PLAYBACK`, not Web Audio and not the exported MP4.

The saved timeline is the source of truth. Timing was not rewritten for the test.

Film `cmvrdlbwg0005dh92s468jz8g`. End `32000` ms. User A started playback with the timeline play button.

## Saved clips

| Stem | Start | Clip duration | File duration |
| --- | ---: | ---: | ---: |
| Dialogue | 500 | 3000 | 3000 |
| Dialogue | 5000 | 5000 | 2000 |
| Music bed | 2000 | 30000 | 30000 |
| Music | 5000 | 8270 | 3000 |
| SFX | 5000 | 2757 | 1000 |
| SFX | 8000 | 1000 | 1000 |

A file that is shorter than its clip stops at the end of the file. That is the fixture, not a second scheduler.

## Defect found and fixed

Assigning `currentTime` on every animation frame cancelled the in-progress seek, so stems stayed at 0. `shouldResyncMedia` seeks only when the element is not already seeking, has metadata, and is more than 0.35 s away from the playhead.

After that, seeks still never finished. Local media answered a `Range` request with the whole file and `Cache-Control: no-store`. Chromium then stayed at `readyState` 1 with `seeking` true. The local media and library file routes now answer `206` with `Accept-Ranges: bytes` and `Cache-Control: private`. Playback calls `play()` only when the element is paused and not seeking.

## Measurements after the fix

Evidence: `docs/studio-v27-3-1/evidence/audio-report.json`.

Clock before scene 2: `1600`. Dialogue position `1057` (expected about `1100`), `readyState` 4, playing. Music and SFX were correctly off.

Shortly after 5000 ms, clock `5617`:

- Dialogue position `560` (expected `617`), playing.
- Music bed position `3544` (expected `3617`), playing.
- Second music position `560` (expected `617`), playing.
- SFX position `537` (expected `617`), playing.

700 ms later, clock `6316`. Those same stems had advanced by about `695` ms, except the 1-second SFX file, which had reached its end.

After the first SFX window, clock `8416`. The 5000 ms SFX was off. The 8000 ms SFX was on at position `305` (expected about `416`) and playing. Music bed position `6342`.

Pause held the clock at `8416`. Resume moved it to `9216`. The music bed advanced from `6342` to `6974`.

Seek backward to about `1816`: dialogue position `1252`, video position `1406`, music off. Seek forward to about `7083`: music bed `5009`, second music `2009`, both playing.

Completion clock `31816` of `32000`. Music bed position `29743` (expected about `29816`), `readyState` 4, playing.

Pause, resume, and both seeks were taken from the same HTML audio elements. The exported MP4 was not used as this evidence.
