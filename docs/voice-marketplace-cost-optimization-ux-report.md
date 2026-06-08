# Voice Marketplace Cost Optimization & UX Finalization Report

## Preview Cache

Lazy permanent cache for ElevenLabs voice previews:

- **Cache key**: `voiceId + previewTextHash + language + modelId` (via `buildVoicePreviewDedupHash`)
- **First click**: ElevenLabs TTS → store in Vercel Blob → play
- **Repeat click** (same key): Blob URL → no ElevenLabs call
- **Preview types**: `chef`, `garden`, `designer`, `community`, `generic`, `custom` (metadata only; key unchanged for same text)

Implementation: `src/server/studio/studio-voice-preview-cache.ts` + `lookupVoicePreviewCache` / `storeVoicePreviewCache` wired in `synthesize-character-voice-preview.ts`.

## Cache Storage

- **Audio path**: `studio/voice-previews/{voiceId}/{textHash}.mp3`
- **Manifest**: `studio/voice-previews/manifest.json` (no schema migration)
- **Metadata per entry**: voiceId, textHash, previewType, language, modelId, provider, blobUrl, createdAt, `estimatedCostSavedCount`, `lastHitAt`
- Mock provider bypasses global cache (ephemeral per-user blob as before)

## Cost Metering

| Event | Provider | Action | Metadata |
|-------|----------|--------|----------|
| Cache miss (TTS) | elevenlabs | `elevenlabs_tts` | `cacheHit: false`, `previewDedupHash` |
| Cache hit | cache | `voice_preview_cache_hit` | `cacheHit: true`, `estimatedCostSavedUsd` |

Both are instrumentation-only (no billing sync).

## Preview Dedup Savings

`buildPreviewDuplicationReport` extended with:

- `cacheHitEvents` / `cacheMissEvents`
- `cacheHitRate`
- `estimatedCacheSavingsUsd`
- `topPreviewUsers`, `topPreviewVoices`, `topPreviewTexts`
- Existing `topDuplicates` (most repeated previews / waste estimate)

## Unified Preview Flow

All TTS preview buttons use `requestCharacterVoicePreview` → `generateCharacterVoicePreview(Draft)` → `synthesizeCharacterVoicePreview` with shared cache:

- Karakterstem preview
- Beste stemmatches
- Persona presets (previewType = persona group)
- Quick picks / marketplace TTS previews
- Language override previews
- Clone/draft previews

## Collapsible UX

Voice Center sections (from prior UX sprint, retained):

1. Karakterstem — always visible
2. Beste stemmatches — open when no voice chosen
3. Persona presets — closed
4. Zoek in bibliotheek — closed
5. Mijn stem — closed
6. Geavanceerde taalinstellingen — closed

Collapsed summaries show counts/status.

## Persona Groups

Chef / Garden / Designer / Community nested accordions; role-relevant group open by default.

## Library Lazy Render

Full marketplace (filters + results + load more) renders only after **Bibliotheek openen**. Quick picks shown when library section is expanded.

## Preview Text Relocation

- Main flow: auto-hint only (`previewTextAutoHint`)
- Textarea in **Geavanceerde taalinstellingen** (closed by default)
- `previewTextInput` / `appliedPreviewText` split — no marketplace rerender while typing

## Language Override Cleanup

Same voice for all languages → no NL/EN/DE/FR cards. Admin: **Toon debug taaloverschrijvingen** before rendering overrides.

## Performance

`React.memo` on heavy panels; conditional mount inside open accordions; memoized marketplace context.

## Tests/build status

| Check | Status |
|-------|--------|
| `npx prisma validate` | pass |
| `npx prisma generate` | pass |
| `npm run lint` | pass (0 errors) |
| `npm run build` | pass |
| `npm run test` | **2093/2093** pass |

New tests: `src/lib/studio-voice-preview-cache.test.ts` (+7 tests)
