# Studio Dialogue System (S.7C)

Provider-neutral dialogue planning:

```
Scene → Speaker → Text → Emotion → Timing → Voice intent → Generation
```

## Contract

`buildStoryboardDialoguePlan(storyboard)` → `StudioDialoguePlan`

Sources (in order):

1. Speaker-tagged narration script (`[Name] line`)
2. Untagged narration script → narrator
3. Scene description/title + primary Character

Each line includes:

- speaker Character id (or narrator)
- text
- structured emotion / style
- timing estimate
- voice intent (profile, lock, provenance from `resolveVoiceIdentity`)

## Conversation modes

`single_speaker` · `multiple_speakers` · `conversation` · `interview` · `podcast` · `storytelling` · `commercial` · `documentary`

Detected from storyboard `voiceStyle` + speaker count — no new provider logic.

## Generation boundary

Dialogue planning does **not** call ElevenLabs.  
`audioSpecificationFromDialogueLine` maps into S.7B `AudioSpecification` → Matrix → Transform → GenerationJob.
