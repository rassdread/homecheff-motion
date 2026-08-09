# Studio Audio Provider Transforms (S.7B)

## Boundary

Creative Director / Prompt Matrix **must not** own provider-specific fields.

ElevenLabs-specific fields live at the transform boundary:

- voice ID
- model
- stability / similarity
- language params
- duration constraints
- provider request shape

## Capabilities

| Capability | Transform | Notes |
|------------|-----------|-------|
| TTS | `mapVoiceTransform` + `transformAudioSpecToElevenLabs` | Existing Matrix mapper wrapped |
| Clone | same (mode=clone) | Consent remains on clone path |
| Music | `mapAudioTransform` | |
| SFX | `mapAudioTransform` | User library bed |
| STT | Capability mapped; route may still be legacy | Documented, not rewritten in S.7B |

## Code

- Matrix mappers: `src/lib/studio-prompt-matrix/transforms/elevenlabs.ts`
- S.7B boundary: `src/lib/studio-audio-provider-transforms.ts`

No ElevenLabs SDK rewrite in S.7B.
