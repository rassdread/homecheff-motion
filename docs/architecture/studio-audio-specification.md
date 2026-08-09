# Studio AudioSpecification (S.7B)

Provider-neutral structured audio intent. **Not** a giant prompt string.

```ts
AudioSpecification {
  version: "7b.1"
  capability: VOICE_TTS | VOICE_CLONE | MUSIC_GENERATE | SFX_GENERATE
             | SUBTITLE_TRANSCRIBE | TRANSLATE_EXPORT | AUDIO_MIX
  scope: CHARACTER_VOICE | NARRATION | SCENE_SFX | SCENE_AMBIENCE
       | PROJECT_MUSIC | SUBTITLES | TRANSLATION | AUDIO_MIX
  characterVoice | narratorVoice | language | script | emotion | pace
  music | sfx | ambience | duration | timing
  subtitleIntent | translationIntent | mixIntent | brandAudio
}
```

## Rules

- Only fields supported by current product evidence
- Brand audio may be referenced but `wired: false` in S.7B
- Translation intent mode is `overlay_export` — never dubbing
- SFX `renderSemantics: "project_bed" | "planning_cue_only"`

## Quick intents → seed specs

| Intent | Capability | Scope |
|--------|------------|-------|
| Add voice-over | VOICE_TTS | NARRATION |
| Use this Character voice | VOICE_TTS | CHARACTER_VOICE |
| Create music | MUSIC_GENERATE | PROJECT_MUSIC |
| Create sound | SFX_GENERATE | SCENE_SFX |
| Create subtitles | SUBTITLE_TRANSCRIBE | SUBTITLES |
| Translate video | TRANSLATE_EXPORT | TRANSLATION |

Implementation: `src/lib/studio-audio-specification.ts`
