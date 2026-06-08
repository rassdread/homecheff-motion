# Voice Marketplace Completion Audit

Audit date: 2026-06-06

## Total available ElevenLabs voices

| Source | Before sprint | After sprint |
|--------|---------------|--------------|
| Account (`GET /v1/voices`) | All account voices | Unchanged |
| Shared (`GET /v1/shared-voices`) | **Capped at 500** (env max 2000) | **Unlimited pagination** until `has_more: false` |
| Merged visible | ~521 typical | Full provider catalog (3000+ when API key allows) |

## Total shared voices

Ingestion via `fetchElevenLabsSharedVoices()` — paginates 100/page with no default artificial cap.

Override: `ELEVENLABS_SHARED_VOICES_MAX=<n>` for ops safety; `0` / `unlimited` / `all` = no cap.

## Total accents

Canonical mapping expanded in `studio-voice-accent-model.ts`:

- English: American, British, Australian, Scottish, Irish, South African, Jamaican, Caribbean, Canadian, New Zealand, Nigerian, Indian, Italian
- Dutch: Nederlands, Vlaams, Surinaams
- Spanish: Spain, Latin American
- French: France, Canadian
- Plus: German, Russian, Italian, Portuguese, Arabic, Mandarin, Japanese, Korean, Hindi, Polish, Swedish

Shared accent aliases expanded in `normalizeSharedAccent()`.

## Total languages

Full display labels via `studio-voice-language-labels.ts` + i18n (`studio.voiceLibrary.language.*`) — not ISO codes in UI.

## Catalog limits

| Limit | Status |
|-------|--------|
| Server shared cap 500 | **Removed** (default unlimited) |
| Client browse page size | 24 (lazy load — unchanged) |
| Server cache TTL | 1 hour |
| Admin audit top 100 | Admin API only — **removed from character browse UI** |

## Accent coverage gaps

- Voices with non-canonical accent strings still searchable by raw text
- Clone voices have no accent metadata — filtered out when accent/gender/age filters active
- `standard` accent resolved via language + description heuristics

## Persona coverage

14 curated personas — strict accent gate preserved. Added:

- `personaScore` on resolved presets
- `matchReasonKeys` for transparent matching (accent, gender, name hint, metadata)

## Story recommendation opportunities

Implemented in `studio-voice-marketplace.ts`:

- `buildVoiceRecommendations()` — character + story keyword scoring
- `buildStoryAwareVoicePreviewText()` — chef/designer/market previews
- Reuses `studio-voice-location-suggestions.ts` for location rules

## Character recommendation opportunities

- `VoiceMarketplaceContext` from character identity (type, personality, clothing, usage)
- Compatibility score 0–100 per voice card
- Top 6 recommendations shown above unified filter bar

## Performance impact

- Full catalog fetch increases server cold-start time and JSON payload size
- Mitigation: 1hr server cache, client lazy-load 24 rows, in-memory filter
- No per-keystroke API calls

## Exact implementation plan (completed)

1. ✅ Remove 500 shared voices cap
2. ✅ Expand accent + language mapping
3. ✅ Unified filter UX (chips + dropdowns, no duplicate accent dropdown)
4. ✅ Active filters bar + reset
5. ✅ Single results list (library + clones)
6. ✅ Voice cards with full labels + compatibility %
7. ✅ Story-aware preview text
8. ✅ Dynamic + story-aware recommendations
9. ✅ Persona presets v2 (score + match reasons)
10. ✅ Clone voices in library with “My voice” badge
11. ✅ Character voice selection memory in `voiceNotes`

## New files

- `src/lib/studio-voice-language-labels.ts`
- `src/lib/studio-voice-marketplace.ts`
- `src/lib/studio-voice-selection-memory.ts`
- `src/lib/studio-voice-marketplace.test.ts`

## Reused (not rebuilt)

- `studio-voice-library-catalog.ts` merge + cache
- `studio-voice-shared-catalog.ts` ingestion
- `studio-voice-persona-presets.ts` + accent match gate
- `studio-voice-location-suggestions.ts`
- `studio-character-identity-voice-hints.ts`
- Clone library blob manifest
- `VoiceLibraryProvider` / API route
