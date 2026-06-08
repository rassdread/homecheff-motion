# Voice Library Accent Metadata Mapping Fix Report

**Date:** 2026-06-06

## Root cause

Live ElevenLabs voices expose accent/language metadata primarily via `verified_languages[]`, but Studio only mapped `labels.accent`, `labels.language`, etc. On production (`catalog.source: "elevenlabs"`), this left accents empty → accent filters empty, language filter EN-only, and persona presets fell back to arbitrary EN voices via mock-only fallback IDs.

## Welke ElevenLabs metadata nu wordt gelezen

| Field | Mapped to |
|-------|-----------|
| `labels.accent/gender/age/language` | Primary source (unchanged) |
| `verified_languages[].accent` | `accent` fallback |
| `verified_languages[].language` | `language` fallback |
| `verified_languages[].locale` | `language` + accent via locale inference |
| `verified_languages[].preview_url` | `previewUrl` fallback |
| `description` | Accent keyword parsing fallback |
| `voice_id`, `name`, `category`, `preview_url` | Unchanged |

**Still ignored (not needed for filters):** `settings`, `fine_tuning`, `sharing`.

## Hoe verified_languages wordt gemapt

`pickVerifiedLanguage()` selects the best verified entry (prefers accent + label language match). `mapElevenLabsVoice()` merges:

1. `labels.*`
2. Selected `verified_languages` row
3. Locale inference (`nl-BE` → flemish, `en-GB` → british, etc.)
4. Description accent keywords

## Hoe language classification werkt

`normalizeLanguageCode()` extracts primary ISO code from `labels.language`, `verified_languages[].language`, or `verified_languages[].locale`. No hardcoded `"en"` fallback when verified data specifies another language.

## Hoe accent classification werkt

Accent string from labels → verified → locale inference → description. `classifyVoiceAccent()` uses longest-matcher-first ordering so `"latin american"` maps to `spanish.latin_american`, not `english.american`.

## Hoe canonical accents zijn verbeterd

Added: `english.italian`, `english.nigerian`, `english.indian`. Reordered matchers (longer phrases first). Narrowed `english.canadian` to `"canadian english"` to avoid clashing with `"canadian french"`.

## Hoe persona preset matching is verbeterd

- Minimum match score remains **5**.
- Live catalog **never** uses `mock-*` fallback IDs.
- No random first-voice fallback.
- Unmatched personas return `available: false` with `studio.voicePersona.unavailable.noMatch`.
- UI shows disabled persona cards; voice center omits unavailable personas from dropdown.

## Hoe live vs mock veilig blijft

- Mock catalog unchanged for dev without `ELEVENLABS_API_KEY`.
- Live fetch no longer injects mock voice rows when API returns data.
- `isMockOnlyVoiceId()` guards persona fallbacks on live source.
- `catalog.source` remains `"elevenlabs"` vs `"mock"` in API payload.

## Welke bestanden zijn aangepast

| File | Change |
|------|--------|
| `src/lib/studio-voice-library-catalog.ts` | `mapElevenLabsVoice`, verified_languages helpers |
| `src/lib/studio-voice-accent-model.ts` | Canonical accents + stricter matching |
| `src/lib/studio-voice-persona-presets.ts` | Safe resolution, `available` flag |
| `src/lib/studio-voice-location-suggestions.ts` | Filter available personas |
| `src/components/studio/studio-character-voice-library-section.tsx` | Missing metadata copy, disabled personas |
| `src/components/studio/studio-character-voice-center.tsx` | Skip unavailable personas |
| `src/i18n/locales/nl.ts`, `en.ts` | New accent + UX keys |
| `src/lib/studio-voice-library-accent-mapping.test.ts` | **New** — 8 mapping tests |
| `src/lib/studio-voice-library-foundation.test.ts` | Updated assertions |
| `package.json` | Test script entry |

## Wat bewust niet gebouwd is

- New TTS provider / voice engine
- New UI shell or browse redesign
- Mock catalog expansion
- Schema migrations
- New persona engine or AI selection

## Tests/build status

Run validation after merge — expected:

- `npx prisma validate` ✅
- `npx prisma generate` ✅
- `npm run lint` ✅
- `npm run build` ✅
- `npm run test` ✅ (includes 8 new accent-mapping cases)
