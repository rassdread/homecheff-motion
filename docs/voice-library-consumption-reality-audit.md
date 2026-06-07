# Voice Library Consumption Reality Audit

**Date:** 2026-06-06  
**Scope:** Pre-sprint audit for ElevenLabs voice library consumption (no new TTS/AI/schema).

## Existing voice systems

| System | Status | Location |
|--------|--------|----------|
| ElevenLabs TTS | Live | `src/lib/elevenlabs-voice.ts` |
| 6 mood presets | Live (hardcoded IDs) | `PROFILE_VOICE_IDS` |
| Voice clone (IVC) | Live | `clone:<id>` refs |
| Character preview | Live | `generate-character-voice-preview.ts` |
| Voice identity | Live | `studio-voice-identity-resolver.ts` |
| Voice director | Planning only | `studio-voice-director.ts` |
| Motion narration | Live | voice execution pipeline |

## Metadata consumed before sprint

- Preset id, stability/similarity/style, language_code
- Clone provider voice id
- Character `voiceGender`, `voiceDescription` (display only)

## Metadata lost / unused before sprint

- ElevenLabs voice list (`GET /v1/voices`)
- accent, gender, age, language labels from library
- preview_url samples
- voice category
- Persona differentiation (UI showed mood presets only)

## UI surfaces that consumed voice

- `StudioCharacterVoiceCenter` — 6-preset dropdown
- Clone panel — `clone:<id>`
- Storyboard narration — presets
- Per-language overrides — presets only (clone stripped in preview path)

## Duplication / gaps

- **Bug:** preview path used `normalizeStudioVoiceProfileId()` → clones fell back to `warm_narrator`
- **Gap:** no library browse, accent filters, persona presets
- **Gap:** Director/Brief had no location→accent voice suggestions

## Accents available (via ElevenLabs labels)

Canonical model maps raw labels (e.g. `british`, `jamaican`, `dutch`, `surinamese`) to filter groups — only accents present in fetched catalog are shown.

## Sprint outcome

See `docs/voice-library-consumption-persona-presets-report.md`.
