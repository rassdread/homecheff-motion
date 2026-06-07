# Voice Library Consumption & Persona Presets Report

**Date:** 2026-06-06  
**Sprint:** Voice Library Consumption & Persona Presets

## Summary

Studio now consumes the ElevenLabs voice library (`GET /v1/voices`), exposes accent/persona browsing in Character Voice Center, fixes clone preview retention, and adds advisory voice suggestions in Director, Production Brief, and Creation Assistant — without new TTS providers, schema migrations, or AI generators.

## Reality audit

See `docs/voice-library-consumption-reality-audit.md` and prior `docs/voice-accent-persona-library-audit.md`.

## Metadata now consumed

| Field | Source | Used for |
|-------|--------|----------|
| voice_id | ElevenLabs | `library:<id>` refs, TTS |
| name | ElevenLabs | UI labels |
| accent, gender, age, language | labels | Filters, persona matching |
| preview_url | ElevenLabs | Instant library preview |
| category | ElevenLabs | Catalog display |

## Accent classification

`src/lib/studio-voice-accent-model.ts` — canonical families (English, Dutch, Spanish, French) with matchers for raw ElevenLabs accent strings. `buildAccentFilters()` returns only accents present in the live/mock catalog.

## Persona presets

`src/lib/studio-voice-persona-presets.ts` — curated presets (British Chef, Jamaican Street Chef, Dutch Grower, etc.) resolved to unique library voice IDs via scoring (accent, gender, language, name hints). No AI generation.

## Character Voice Center

- Persona Presets section
- Voice Library browse with accent/gender/language/age filters + search
- `StudioAudioPreviewPlayer` for ElevenLabs `preview_url`
- Classic 6 presets retained for backward compatibility
- `VoiceLibraryProvider` loads catalog once per expanded character voice panel

## Preview & clone

- Preview/synthesis uses `normalizeVoiceProfileForSynthesis()` — preserves `clone:` and `library:` refs
- Clone voices show **Cloned voice** persona label via existing i18n

## AI Director suggestions

`buildDirectorVoiceSummary()` adds `voiceSuggestions[]` from location names (Kingston→Jamaican, Amsterdam→Dutch, etc.). Advisory only — no auto-select.

## Production Brief

Optional `studio.productionBrief.recommendation.voicePersonas` recommendation from content type + idea/location keywords.

## Creation Assistant

Task `studio.creationAssistant.task.chooseVoice` when story voice enabled and character has no explicit library/clone/non-default preset choice. Source: `voice_library`.

## Files changed / added

| Area | Files |
|------|-------|
| Catalog | `src/lib/studio-voice-library-catalog.ts` |
| Accents | `src/lib/studio-voice-accent-model.ts` |
| Personas | `src/lib/studio-voice-persona-presets.ts` |
| Suggestions | `src/lib/studio-voice-location-suggestions.ts` |
| Profile refs | `src/lib/studio-voice-profile-ref.ts` |
| API | `src/app/api/studio/voice-library/route.ts` |
| Client cache | `src/lib/studio-voice-library-client.ts` |
| UI | `studio-voice-library-provider.tsx`, `studio-character-voice-library-section.tsx`, `studio-character-voice-center.tsx`, `studio-workspace-character-voice-inline.tsx` |
| Preview fix | `generate-character-voice-preview.ts`, `synthesize-character-voice-preview.ts` |
| Integrations | `studio-director-proposal-builder.ts`, `studio-production-brief-builder.ts`, `studio-creation-assistant.ts` |
| Types | `studio-director-proposal.ts`, `studio-creation-assistant.ts`, `studio-audio-preview.ts` |
| i18n | `en.ts`, `nl.ts` |
| Tests | `studio-voice-library-foundation.test.ts`, `studio-voice-clone-foundation.test.ts` |
| Docs | this file, reality audit |

## Deliberately not built

- New TTS providers / voice engines
- Marketplace or generative persona builder
- Prisma schema migrations
- Auto voice selection
- Per-card library fetch (single session cache instead)

## Next sprint candidates

1. Surface Director `voiceSuggestions` in proposal UI panel
2. Storyboard-level library voice picker (not only character)
3. Persist persona preset id alongside `library:<id>` for analytics
4. Refresh catalog on clone create (optional invalidation)
5. E2E: Voice Center library browse + preview smoke

## Validation

Run: `npx prisma validate`, `npx prisma generate`, `npm run lint`, `npm run build`, `npm run test`
