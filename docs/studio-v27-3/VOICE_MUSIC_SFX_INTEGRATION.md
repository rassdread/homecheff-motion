# Voice, music, and sound effects

## Why the voice form stayed on “Loading workspace…”

`/studio?storyboardId=&tool=voice&scene=` redirected to `/studio/open/storyboard/{id}` and dropped `tool`, `scene`, `idea`, and `returnTo`. The open handler then replaced the URL with the film project. The orbit route loader (`platform.orbit.routeTransition`) is the string “Loading workspace…”. The voice form never mounted.

`studioStoryboardOpenHref` now keeps `tool`, `scene`, `idea`, and a safe `returnTo`. When the tool is voice, music, or sound, the open page sends the browser to `/studio/audio/create` with the film project, scene, and return path.

## Browser result

User A opened the scene 2 voice link (`tool=voice` and `scene=cmvrdnblh000bdh92jjl4bhrb`). The page reached `mode=voice`. `evidence/voice-form-1440.png` shows:

- Script: `The guide prepares the product and shows the result.`
- Language `nl`, profile `warm_narrator`, narration `narrator`
- Server quote: `15 HC`
- Request line: `model: eleven_multilingual_v2`
- `voiceStillLoading: false`

The existing file input `[data-testid="studio-v273-audio-file"]` received `voice.wav` (440 Hz, 2 seconds). The page returned to the scene URL. Music (`music-tone.wav`, 220 Hz) and the sound effect (`sfx-tone.wav`, 880 Hz) did the same. `musicPanel` was `loaded`, not `loading`.

Timeline rows created at 12:02, all starting at 5000 ms (scene 2's start on this film):

| Track | Source | Duration |
| --- | --- | --- |
| DIALOGUE | `library_asset` `cmvs2dx3r005qdh9231vlhulp` | 5000 ms |
| MUSIC | `user_audio` `5ecb6f5a-8226-4b09-a27f-51409e8a6820` | 8270 ms |
| SFX | `user_audio` `1f7bebd8-3d00-4dcf-a79f-83092ed0cb8d` | 2757 ms |

No generate action was posted. The quote on the form is the existing server quote. User C's later quote is in `ZERO_HC_PROJECT_CREATION.md`.
