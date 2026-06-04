# Studio AI Voice Director (V28)

Planning layer for ElevenLabs voice-over — scripts, timing, presets, and production scoring. No TTS API calls or background jobs in V28.

## Shipped

- Storyboard fields: `voiceEnabled`, `voiceLanguage`, `voiceStyle`, `voiceProfile`, `narrationMode`, `voiceNarrationScript`
- Voice presets and narration modes
- Script builder (full / per-scene / short / subtitle)
- Timing planner with fit scores and warnings
- `elevenlabs-voice.ts` request + credit estimate + validation
- `overallProductionScore` combining visual, story, director, and voice

## Future

- ElevenLabs API integration and preview playback
- Per-scene voice clips synced to `durationSeconds`
- Background job for batch narration export
