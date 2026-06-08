# Voice Marketplace Metadata & Filter Architecture Audit

Audit date: 2026-06-08  
Scope: ElevenLabs `GET /v1/voices` + `GET /v1/shared-voices` via existing HomeCheff ingest — **no new provider, no schema migrations, no new voice library**.

---

## Available Metadata

### From ElevenLabs APIs (typed in codebase)

| Field | Account `/v1/voices` | Shared `/v1/shared-voices` | Stored on `VoiceLibraryEntry` |
|-------|---------------------|---------------------------|-------------------------------|
| `voice_id` | ✓ | ✓ | `id` |
| `name` | ✓ | ✓ | `name` |
| `labels` (object) | ✓ | ✓ | `labels` (full copy) |
| `labels.accent` | ✓ | ✓ | `accent` + `labels.accent` |
| `labels.gender` | ✓ | ✓ | `gender` |
| `labels.age` | ✓ | ✓ | `age` |
| `labels.language` / `locale` | ✓ | ✓ | `language` |
| `labels.use_case` | sometimes | sometimes | `labels.use_case` (search + cards) |
| `accent` (top-level) | — | ✓ | merged into `accent` |
| `language` (top-level) | — | ✓ | merged into `language` |
| `gender` / `age` (top-level) | — | ✓ | merged |
| `category` | ✓ | ✓ | `category` |
| `description` | ✓ | ✓ | `description` |
| `preview_url` | ✓ | ✓ | `previewUrl` |
| `verified_languages[]` | ✓ | ✓ | flattened → accent/language/preview |
| `verified_languages[].locale` | ✓ | ✓ | **now preserved** as `labels.verified_locale` |
| `verified_languages[].accent` | ✓ | ✓ | used in accent inference |
| `verified_languages[].language` | ✓ | ✓ | used in language inference |
| `verified_languages[].preview_url` | ✓ | ✓ | fallback preview |
| `public_owner_id` | — | ✓ typed | **discarded** |
| `settings` | documented | — | **discarded** |
| `fine_tuning` | documented | — | **discarded** |
| `sharing` | documented | — | **discarded** |
| `verified_languages[].model_id` | ✓ typed | ✓ typed | **discarded** |

### Not provided by ElevenLabs (cannot filter honestly)

| Field | Status |
|-------|--------|
| `country` | **Not an API field** — derived from canonical accent + BCP47 locale |
| `region` / `city` | **Not an API field** — only when name/description/labels contain known city tokens |
| `dialect` | Partial — raw `accent` string only |
| `nationality` | **Not an API field** |
| `profession` | **Not an API field** — sometimes implied in `description` or `use_case` |
| `voice style` | **Not in voice list API** (TTS `style` is generation-time, not catalog) |

---

## Missing Metadata

Data ElevenLabs may return but we **do not persist**:

- `public_owner_id` (shared voices)
- Full `verified_languages[]` array (only first/best entry flattened)
- `model_id` per verified language
- Account voice `settings`, `fine_tuning`, `sharing` blobs

Data product **expects** but provider **does not supply** as structured fields:

- Country, region, city, nationality, dialect registry, profession, native language flag

---

## Current Filter Problems (pre-refactor)

| Problem | Root cause |
|---------|------------|
| Accent chips felt arbitrary vs geography | Accent-only discovery with no country context |
| Language + accent overlap | Both encode locale; users filter twice for same intent |
| Static facet counts | Full-catalog counts before faceted sprint |
| 12k scale UX | Flat chip wall; no hierarchy |
| Clone voices disappear under accent filter | Clones lack accent metadata |
| Region examples (Paramaribo, Rotterdam) missing | City never extracted from metadata |
| Premium vs included unclear | Category shown but not access tier |

---

## Proposed Filter Hierarchy

Implemented order (only show levels with **count > 0**):

```
LAND (derived from accent canonical + locale)
  ↓
REGIO / STAD (only if token in name | description | labels)
  ↓
ACCENT (canonical chips, faceted)
  ↓
TAAL (dropdown, faceted)
  ↓
GENDER (dropdown, faceted)
  ↓
LEEFTIJD (dropdown, faceted)
  ↓
CATEGORIE (dropdown, faceted)
  +
ZOEKEN (name, accent, language, description, all label values)
```

**Honesty rule:** Netherlands → Rotterdam only appears when voices in the filtered set contain `"rotterdam"` in text. No invented geography.

---

## Dynamic Filter Model

| Mechanism | Implementation |
|-----------|----------------|
| Faceted counts | `buildFacetedMarketplaceFilterOptions`, `buildFacetedAccentCoverage` |
| Country facets | `buildFacetedCountryCoverage` |
| Region facets | `buildFacetedRegionCoverage` (scoped to selected country) |
| Cross-filter | Each dimension omits its own active filter when counting (Airbnb-style) |
| Cascade reset | Changing country clears region; all dimensions narrow results list |

Module: `src/lib/studio-voice-geography-model.ts`

---

## Voice Card Improvements

`VoiceMarketplaceCard` now shows:

- Name, category badge, **access tier** (included / premium / marketplace / clone)
- **Country · region · accent** line (when derivable)
- Language, gender, age
- Locale + use case (when in labels)
- Provider, compatibility %
- **Preview button** on card + inline audio player
- Use voice / selected

---

## Preview Improvements

| Surface | Preview |
|---------|---------|
| Main character voice card | TTS story-aware preview |
| Recommendation cards | TTS + catalog preview |
| Marketplace result cards | **Preview button** + catalog `previewUrl` player |
| Per-language advanced section | TTS per language |

Previews no longer require selecting a voice first on recommendations; marketplace cards expose preview in the card header.

---

## Persona Matching Improvements

Without changing accent-gate:

- `resolveStoryCountryHints()` — story/character text → country ids
- `computeVoiceCompatibilityScore()` — **+18** when voice country matches story country; soft penalty when mismatch
- Existing story accent rules (+25) unchanged
- Persona preset scoring unchanged (strict gate preserved)

Example: Surinaamse chef → boosts `suriname` country + `dutch.surinaams` accent voices.

---

## Character Assignment Improvements

Voice Center flow (completed prior sprint + this audit):

1. **Karakterstem** — selected main voice (default for all languages)
2. Best voice matches (recommendations with preview)
3. Voice Marketplace (hierarchical filters)
4. **Geavanceerde taalinstellingen** — collapsed; “same voice for all languages” default ON

Marketplace selection → `voiceProfile` + voice memory in `voiceNotes` → character save. Per-language overrides optional under advanced settings.

---

## Advanced Settings Collapse

- Default: collapsed `▶ Geavanceerde taalinstellingen`
- Same voice for all languages: default ON
- Admins: per-language overrides remain available when expanded

---

## Root Cause

The marketplace felt illogical because:

1. **UI presented accent and language as peer filters** although both express locale.
2. **Geography was implicit in accent strings** but never labeled as country/region.
3. **12k voices need hierarchical facets** — flat accent chips do not scale cognitively.
4. **Rich metadata was ingested then flattened** — `verified_languages`, `use_case`, locale lost for UI.
5. **Counts were static** from full catalog (fixed with faceted filtering).

---

## Highest Value Improvements (implemented)

1. Geographic hierarchy from **existing** accent + locale + text tokens
2. Faceted dynamic counts for all filter dimensions
3. Preserve `verified_locale` at ingest
4. Access tier badges (included / premium / marketplace / clone)
5. Richer voice cards + on-card preview
6. Story country boost in compatibility ranking

---

## What NOT to rebuild

| Keep as-is | Reason |
|------------|--------|
| ElevenLabs ingest + pagination | Already loads 12k+ shared voices |
| `VoiceLibraryEntry` shape | No DB migration; extend via labels + derived fields |
| Persona accent gate | Product requirement — ranking only improved |
| TTS / provider layer | Out of scope |
| Separate voice libraries | Single unified marketplace list |
| Invented country/region database | Would violate “only existing metadata” |

---

## Validation

- No new provider
- No schema migrations
- No new voice library
- Uses existing ElevenLabs metadata + marketplace infrastructure
- Tests: `studio-voice-geography-model.test.ts`, `studio-voice-marketplace.test.ts`, voice wiring tests
