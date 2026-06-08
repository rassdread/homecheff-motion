# Voice Library Provider Voice ID Error Fix Report

## Root cause

In `StudioCharacterVoiceLibrarySection`, the persona preset render loop called `formatLibraryVoiceProfileRef(preset.voiceId)` **for every preset during render**, including unavailable personas where `buildVoicePersonaPresets()` sets `voiceId: ""` (no live ElevenLabs match after the accent mapping fix).

`formatLibraryVoiceProfileRef("")` throws **`Provider voice id is required.`** — an uncaught render error in production when the persona tab lists unavailable presets.

Secondary risk: malformed stored refs like `library:` (empty suffix) previously fell through to preset normalization (`warm_narrator`) instead of being rejected before TTS.

## Welke voiceProfile fout ging

- **Trigger:** unavailable persona preset cards with `voiceId: ""` on the Persona & bibliotheek tab
- **Type:** library ref formatting during render (not preview/TTS yet)
- **Also guarded:** `library:` / `clone:` with empty provider id on preview/synthesis paths

## Hoe unavailable persona’s nu werken

- `canSelect = preset.available && Boolean(preset.voiceId.trim())`
- Disabled cards show existing `studio.voicePersona.unavailable.*` copy
- `formatLibraryVoiceProfileRef` only runs inside `onClick` when `canSelect` is true
- No render-time throw for empty `voiceId`

## Hoe empty provider IDs worden voorkomen

- `parseVoiceProfileRef()` always returns `library`/`clone` kind when prefix matches (even if id empty)
- `validateVoiceProfileForSynthesis()` rejects empty clone/library provider ids
- `validateVoiceSettings()` rejects before request planning
- `resolveElevenLabsVoiceId()` throws if provider id missing
- `safeFormatLibraryVoiceProfileRef()` for UI catalog/override options
- `synthesizeCharacterVoicePreview()` returns **400** `PROVIDER_VOICE_ID_REQUIRED` — no TTS fetch

## Hoe preview errors netjes worden getoond

- Voice Center: client guard before preview fetch → `studio.voiceLibrary.unavailableVoice` (*Deze stem is niet beschikbaar*)
- Selection guard blocks storing invalid refs
- API draft/saved preview routes return JSON `{ error, code }` with HTTP 400
- Dev-only `console.warn` when synthesis is blocked (no uncaught throw)

## Tests/build status

See validation run after implementation:

```bash
npx prisma validate
npx prisma generate
npm run lint
npm run build
npm run test
```

New tests: `src/lib/studio-voice-provider-voice-id-fix.test.ts` (13 cases)

Latest run: **1947/1947** pass, lint 0 errors, build OK.
