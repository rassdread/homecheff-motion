# Audio workflow recovery

## Voice

The library at `/studio/assets/media/voices` is still the browser for saved voices. It is no longer the destination of "Maak een stem".

The create page shows the script, language (`nl`, `en`, `es`, `fr`), voice profile, and narration mode. `validateVoiceSettings` and `buildVoiceRequest` are the same functions `generateStoryboardVoice` uses. The assembled request keeps `model_id` `eleven_multilingual_v2`. A script that says `model_id: other-provider` does not change that field. The test is in `studio-v27-1-integration.test.ts`.

When the film scene has a storyboard id, the scene link is `/studio?storyboardId=…&tool=voice&scene=…`. The workspace shell reads `tool` and `scene` and opens the existing voice tool, which includes `StudioVoiceDirectorPanel` and `StudioVoicePreviewPanel`. That panel is the one that calls `generateStoryboardVoiceApi`. This pass did not call it.

Without a storyboard, the create page explains that synthesis runs in that tool. It does not post to ElevenLabs.

The page also requests `POST /api/me/studio-credits/preview` for `voice_generation`. Opening the form does not send `confirmed`.

## Music

"Maak achtergrondmuziek" opens `StudioV9MusicPanel` with the idea in the prompt field. Genre, mood, duration, and instrumental stay the panel's existing controls. The provider body is `elevenLabsMusicRequestBody`: `prompt`, `music_length_ms`, and `force_instrumental` when instrumental is on. User text stays inside `prompt`. A prompt that says `force_instrumental false` does not remove the flag while the control is on.

A storyboard id lets the existing audio change plan attach the result to the scene. Without one, the panel still shows the form and does not write a storyboard plan.

## Sound effects

A dedicated generator already exists: `StudioV9SoundEffectsPanel` and `POST /api/studio/audio-library/generate-sfx`. "Maak een geluidseffect" opens that panel. The provider body is `elevenLabsSfxRequestBody`: `text` and `duration_seconds`.

The panel can now generate without a selected scene. It attaches the result to a scene only when both a storyboard id and a scene id are present. Library preview and "add existing effect" remain on the same panel. The film audio section link is still selection, not a second generator.

## Not executed

No ElevenLabs HTTP call. `ELEVENLABS_API_KEY` was unset in this shell. No HC capture.
