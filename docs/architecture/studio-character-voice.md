# Studio Character Voice (S.7C)

**Depends on:** S.7B Audio Foundation (frozen `434caf53` baseline doc / `0fc0e161` cert)

## Law

- **Character** owns voice identity, characteristics, continuity, variants
- **Storyboard** owns casting + dialogue planning + narration
- **Creative Director** recommends performance (never forces)
- **Prompt Matrix** assembles provider-neutral AudioSpecification
- **Provider Transform** owns ElevenLabs payload
- **GenerationJobs** own execution / credits / storage

## Character Voice Studio

Contract: `buildCharacterVoiceStudio()` → `CharacterVoiceStudioContract` (`7c.1`)

Aggregates existing Character fields (no Prisma duplication):

- identity via `resolveCharacterVoiceIdentity`
- characteristics (language, gender presentation, notes/tags, …)
- variants (default / happy / angry / whisper / narrator / commercial / story)
- provider capabilities, preview policy, reuse policy

Preview **never** replaces final generation. Reuse ≠ regeneration.

## Variants

`studio-voice-variants.ts` — linked to Character id. Casting may select a variant; identity remains Character-owned.

## Language

Multi-language via existing `voiceProfilesJson` / language overrides. Identity primary; language secondary. No fake multilingual cloning.

## Continuity

`checkCharacterVoiceContinuity()` verifies locked Character voice survives storyboard → motion → render planning hops without silent narrator overwrite.

## Code map

| Module | Role |
|--------|------|
| `studio-character-voice-studio.ts` | Voice Studio contract |
| `studio-voice-variants.ts` | Variants |
| `studio-voice-casting.ts` | Storyboard casting |
| `studio-dialogue-system.ts` | Dialogue plan |
| `studio-voice-emotion.ts` / `studio-voice-style.ts` | Structured metadata |
| `studio-voice-performance-guidance.ts` | CD recommendations |
| `studio-voice-experience-packs.ts` | Pack → Matrix mapping |
| `studio-workspace-voice-entity.ts` | Workspace adapter (no redesign) |
