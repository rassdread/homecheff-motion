# Voice Library Shared Voices Catalog Ingestion Report

## Root cause

The live catalog was limited to **21 premade voices** because `fetchElevenLabsVoiceCatalog()` only called `GET /v1/voices`. The ElevenLabs marketplace (`GET /v1/shared-voices`) exposes **3000+** professional/high-quality voices with far richer accent and language metadata, but was never ingested.

## Welke endpoints nu worden gebruikt

| Endpoint | Doel |
|----------|------|
| `GET https://api.elevenlabs.io/v1/voices` | Account/premade/cloned voices |
| `GET https://api.elevenlabs.io/v1/shared-voices` | Marketplace shared/professional voices (paginated) |

Both are merged into one `VoiceLibraryCatalog` with `source: "elevenlabs"`. Mock catalog unchanged when `ELEVENLABS_API_KEY` is missing.

## Hoe pagination werkt

- Page size: **100** (ElevenLabs max)
- Default cap: **500** voices (`ELEVENLABS_SHARED_VOICES_MAX`, max 2000)
- Stops when cap reached or `has_more: false`
- `paginationLimited: true` when more pages exist beyond the cap
- Result cached **1 hour** (same as existing catalog cache)
- Shared fetch failure degrades gracefully to account voices only (logged in dev)

## Hoe shared voices worden gemapt

`mapElevenLabsSharedVoice()` in `studio-voice-shared-catalog.ts`:

- `voice_id` → `id`
- Top-level `accent`, `language`, `gender`, `age`, `description`, `preview_url`, `category`
- `normalizeSharedAccent()` resolves `standard` and aliases (e.g. received pronunciation → british, nl + standard → dutch)
- Reuses `mapElevenLabsVoice()` for verified_languages enrichment
- Sets `labels.catalog_source: "shared"`
- Categories normalized: `professional`, `high_quality`, `shared`, `premade`, `cloned`

## Hoe account + shared voices worden samengevoegd

1. Fetch account voices from `/v1/voices` (tagged `catalog_source: account`)
2. Fetch shared voices from `/v1/shared-voices` (tagged `catalog_source: shared`)
3. `mergeAccountAndSharedVoices()` dedupes on `voiceId`
4. On conflict: **account wins** for `name`, `previewUrl`, and `labels.catalog_source`

## Hoe dedupe werkt

- Shared voices loaded first into a map by id
- Account voices overlay matching ids (`dedupeCount` incremented)
- Visible count = unique ids after merge

## Hoe accent coverage verbeterd is

Shared voices bring canonical accents (british, american, indian, latin american, dutch, irish, south african, nigerian, etc.) into `catalog.voices`. Existing `buildAccentFilters()` and accent discovery chips consume real counts automatically. Featured zero-count chips unchanged.

## Hoe persona presets nu echte shared voices kunnen gebruiken

Strict persona matching (`studio-voice-persona-accent-match.ts`) unchanged. With shared ingestion, personas like **British Chef**, **Jamaican Street Chef**, and **Dutch Grower** can resolve to real marketplace voices when accent/language metadata matches. No mock fallback on live `elevenlabs` source.

## Hoe performance is bewaakt

**Optie A chosen:** server fetch capped at **500 shared voices** (configurable), merged catalog sent to client once; existing Load More pagination (24/page) within that catalog.

**Trade-off:** Not all 3000+ marketplace voices are loaded. Search/filter operate on the capped catalog. Increase `ELEVENLABS_SHARED_VOICES_MAX` if needed; full server-side search endpoint deferred.

## Hoe TTS access errors worden afgehandeld

- `isElevenLabsVoiceAccessDenied()` detects 401/403 and permission-related bodies
- `ElevenLabsVoiceAccessDeniedError` with code `VOICE_LIBRARY_ACCESS_DENIED`
- Character voice preview returns 403 with user-facing EN message
- UI shows i18n `studio.voiceLibrary.ttsAccessDenied` (EN/NL)

## Welke bestanden zijn aangepast

| File | Change |
|------|--------|
| `src/lib/studio-voice-shared-catalog.ts` | **New** — shared mapper, pagination, dedupe |
| `src/lib/studio-voice-library-catalog.ts` | Merge account + shared, ingestion metadata |
| `src/lib/studio-voice-accent-coverage.ts` | Stats + category badges |
| `src/lib/studio-voice-accent-model.ts` | received pronunciation → british |
| `src/lib/elevenlabs-voice.ts` | TTS access denied detection |
| `src/server/studio/synthesize-character-voice-preview.ts` | Friendly access error |
| `src/lib/studio-character-voice-preview-client.ts` | Error code propagation |
| `src/components/studio/studio-character-voice-center.tsx` | i18n access denied message |
| `src/app/api/admin/studio/voice-library-audit/route.ts` | Ingestion audit fields |
| `src/components/studio/studio-voice-library-admin-audit-panel.tsx` | Admin ingestion UI |
| `src/i18n/locales/en.ts`, `nl.ts` | New strings |
| `src/lib/studio-voice-shared-catalog.test.ts` | **New** tests |
| `src/lib/studio-voice-accent-coverage.test.ts` | Badge tests |
| `package.json` | Test registration |

## Wat bewust niet gebouwd is

- Geen nieuwe voice provider of TTS engine
- Geen Voice Library UI rebuild
- Geen schema migraties
- Geen parallelle voice-library v2
- Geen server-side search endpoint (deferred)
- Geen guarantee dat alle professional voices synthesize on all tiers

## Tests/build status

| Check | Status |
|-------|--------|
| `npx prisma validate` | OK |
| `npx prisma generate` | OK |
| `npm run lint` | OK (0 errors) |
| `npm run build` | OK |
| `npm run test` | **2005/2005** pass |

New tests: `src/lib/studio-voice-shared-catalog.test.ts` (10 cases) — pagination, dedupe, shared mapping, persona match, search, TTS access denied, mock unchanged.
