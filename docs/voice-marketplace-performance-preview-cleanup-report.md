# Voice Marketplace Performance & Preview Cleanup Report

## Persona Preview Fix

**Root cause:** Persona preset cards in `StudioCharacterVoiceLibrarySection` only rendered metadata and a “Stem gebruiken” button. Unlike `VoiceRecommendationCard`, they never called `requestCharacterVoicePreview` or rendered `StudioAudioPreviewPlayer`.

**Fix:** New `VoicePersonaPresetCard` and exported `StudioVoicePersonaPresetsPanel` in `studio-character-voice-library-section.tsx`:
- Available personas: **Stemvoorbeeld** button, loading state, inline TTS player, optional catalog preview URL, per-card error line
- Unavailable personas: no preview/select actions, existing unavailable reason copy
- Access denied: `CharacterVoicePreviewError` with code `VOICE_LIBRARY_ACCESS_DENIED` → `studio.voiceLibrary.ttsAccessDenied`
- Preview uses `sampleLine` from voice center (`buildStoryAwareVoicePreviewText` when user has not overridden text)

## Catalog Performance

**Finding:** `GET /api/studio/voice-library` returned the full catalog (~12k voices) in one JSON payload to the client on first load. Client-side browse pagination (`BROWSE_PAGE_SIZE = 24`) only helped after the entire payload arrived.

**Fix (smallest safe change):** Two-phase client load in `studio-voice-library-client.ts`:
1. `GET /api/studio/voice-library?summary=1` — personas, stats, filter options, accent coverage; **empty** `catalog.voices`
2. Background `GET /api/studio/voice-library` — full catalog merged into store when ready

Store exposes `loadingVoices` and `voicesReady`. Full-catalog failure does not clear summary payload (personas still work).

## Initial Load Behavior

- **Immediate:** main voice card, persona presets (from summary), auto-preview hint
- **Progressive:** recommendations and marketplace browse wait for `voicesReady`; show `studio.voiceLibrary.loadingVoices` (“Stemmen worden geladen…”)
- Character form is not blocked by catalog ingest

## Preview Text Relocation

- Removed prominent preview textarea from main voice-center flow
- Added `studio.voiceCenter.previewTextAutoHint` in main flow
- Preview textarea moved into collapsed **Geavanceerde taalinstellingen** (default closed)
- Override still respected via `previewTextTouched` / `resolvedPreviewText`

## Story-aware Preview Consistency

- Main voice, recommendations, and persona presets all use `resolvedPreviewText` (story-aware default from `buildStoryAwareVoicePreviewText`)
- Per-language override previews in advanced section use the same `resolvedPreviewText`
- Marketplace cards continue catalog URL preview where available (no duplicate textarea in main flow)

## UI Cleanup

**Section order in Voice Center:**
1. Karakterstem (`CharacterMainVoiceCard`)
2. Beste stemmatches (`StudioVoiceRecommendationsPanel`, when `voicesReady`)
3. Persona presets (`StudioVoicePersonaPresetsPanel`)
4. Voice Marketplace tabs + browse (`StudioCharacterVoiceLibrarySection`)
5. Geavanceerde taalinstellingen (collapsed; includes preview text override)

Persona presets removed from bottom of library section to avoid duplicate lists.

## Tests/build status

Extended `studio-character-form-voice-wiring.test.ts` for section order, advanced-only preview text, persona preview wiring, and summary API/client progressive load.

Run validation: `npx prisma validate`, `npx prisma generate`, `npm run lint`, `npm run build`, `npm run test`.
