# Voice Marketplace Metadata Repair Report

Report date: 2026-06-06  
Validation: no new provider · no new TTS engine · no new voice library · no schema migrations · no parallel catalog.

---

## Catalog Statistics

| Metric | Mock catalog (CI) | Live catalog (API key) |
|--------|-------------------|------------------------|
| Total voices | 18 | 3000+ shared + ~21 account |
| Sources | `mock` | `elevenlabs` account + shared |
| Ingest | `buildVoiceLibraryCatalog()` | Runtime pagination `/v1/shared-voices` |

Live totals available via `GET /api/admin/studio/voice-library-audit` → `metadataRepair.coverage`.

---

## Metadata Coverage

**Before repair (scattered heuristics in `mapElevenLabsVoice`):**
- Locale/description/name inference split across ingest
- `standard` accent often blocked Caribbean/African/Dutch dialect discovery
- Nigerian classified but not in discovery chips or story rules

**After repair (`studio-voice-metadata-repair.ts`):**
- Single ingest-time repair layer via `applyVoiceMetadataRepair()`
- All inference consolidated; `mapElevenLabsVoice` only copies provider fields
- Repair provenance in `labels._repair_*` (audit only)

| Field | Repair sources (priority) |
|-------|---------------------------|
| Accent | provider (100%) → locale (95%) → verified_language (90%) → description (80%) → name (70%) → weak (50%) |
| Language | provider → verified → locale |
| Locale | verified / labels → repair fill |

---

## Metadata Repair Coverage

Central module: `src/lib/studio-voice-metadata-repair.ts`

| Function | Role |
|----------|------|
| `collectVoiceMetadataRepairCandidates()` | Gather candidates from all provider fields |
| `applyVoiceMetadataRepair()` | Apply highest-confidence repair per field |
| `buildVoiceMetadataCoverageSnapshot()` | Missing accent/language/country counts |
| `buildAccentRegistryAudit()` | Per-accent voice + repaired counts + avg confidence |
| `buildPersonaRecoveryAudit()` | Before/after persona availability |
| `buildVoiceMetadataRepairReport()` | Full admin audit payload |

Locale map: `src/lib/studio-voice-locale-accent.ts` — includes `en-JM`, `nl-SR`, `nl-BE`, `en-NG`, `en-TT`, `en-BB`, `en-GY`, `en-GH`, `en-KE`, `en-PK`, `de-CH`, `zh-HK`, etc.

---

## Accent Registry

**New canonical accents added:**
- `english.trinidadian`, `english.barbadian`, `english.guyanese`
- `english.ghanaian`, `english.kenyan`, `english.pakistani`, `english.welsh`
- `german.swiss`, `chinese.cantonese`, `ukrainian.standard`, `romanian.standard`

**Discovery chips extended:** Nigerian, Trinidadian, Ghanaian added to `VOICE_DISCOVERY_ACCENT_IDS`.

**Shared accent aliases:** trinidadian/barbadian/guyanese/ghanaian/kenyan now map to specific fragments (not generic `caribbean`).

---

## Language Registry

Languages derived from provider `language`, `verified_languages`, and locale primary subtag. Repair fills missing language from locale at 95% confidence.

---

## Country Registry

Geography via `resolveVoiceGeography()` — accent-implied country + locale fallback + explicit city tokens.

**New country mappings:** Trinidad & Tobago, Barbados, Guyana, Ghana, Kenya, Pakistan, Wales, Switzerland, Hong Kong, Ukraine, Romania.

**New region rule:** Lagos → Nigeria.

**Story country hints:** Nigeria, Ghana, Kenya added to `STORY_COUNTRY_KEYWORDS`.

---

## Region Registry

Existing: Paramaribo, Kingston, Antwerp, Amsterdam, Rotterdam, London, Sydney, Utrecht.  
Added: Lagos (Nigeria).

---

## Persona Recovery Audit

`buildPersonaRecoveryAudit(catalog)` compares:
- **Before:** catalog with `revertVoiceMetadataRepair()` per voice
- **After:** repaired catalog

Mock catalog: personas already available (rich metadata). Live catalog gains availability when `standard`/empty accents are repaired to strict persona accent gates.

**Accent gate unchanged** — `studio-voice-persona-accent-match.ts` still forbids American under Jamaican, British under Dutch Grower, etc.

---

## Compatibility Improvements

`computeVoiceCompatibilityScore()` unchanged structurally; benefits from repaired:
- `accentCanonicalId` on marketplace entries
- `resolveStoryCountryHints()` for Nigeria/Ghana/Kenya
- `STORY_ACCENT_RULES` for Nigerian, Ghanaian, Trinidadian keywords

---

## Story Matching Improvements

New `STORY_ACCENT_RULES` entries:
- Nigeria / Lagos / African market → `english.nigerian`
- Ghana / Accra → `english.ghanaian`
- Trinidad → `english.trinidadian`

---

## Filter Improvements

Faceted filters consume repaired metadata through existing paths:
- `buildFacetedCountryCoverage` / `buildFacetedRegionCoverage`
- `buildFacetedAccentCoverage`
- `filterVoiceLibrary` / `filterMarketplaceEntries`

Example: Suriname + `nl` + female → voices with `nl-SR` locale repair classify as `dutch.surinaams` / country `suriname`.

---

## Premium Marketplace Coverage

`buildPremiumMarketplaceCoverage()` reports per access tier (`included`, `premium`, `marketplace`, `clone`):
- voice count, distinct accent count, language count

Exposed in admin audit `metadataRepair.premiumCoverage`.

---

## Before vs After

| Dimension | Before | After |
|-----------|--------|-------|
| Repair architecture | Scattered in ingest | Single `applyVoiceMetadataRepair()` |
| Locale dialects | Partial (no nl-SR, en-TT, en-GH…) | Full global locale map |
| Nigerian discovery | Missing from chips | In `VOICE_DISCOVERY_ACCENT_IDS` |
| Story Nigeria hints | Missing | `STORY_COUNTRY_KEYWORDS` + accent rules |
| Audit provenance | None | `_repair_*` labels + admin API report |
| Canonical accents | 30 | 38+ |

Mock CI snapshot (`buildVoiceMetadataCoverageSnapshot`):
- 18 voices, 10+ canonical accents, personas available on mock

---

## Root Cause

1. ElevenLabs shared voices often ship `accent: "standard"` with dialect only in `verified_languages.locale` or description.
2. Inference was split between `mapElevenLabsVoice`, `normalizeSharedAccent`, and geography — no confidence tracking.
3. Global English/Dutch dialects outside US/UK/NL were under-promoted in discovery and story flows.

---

## Remaining Gaps

1. Live catalog repair rates require API key — run admin audit in production.
2. Persona presets still lack dedicated Flemish/Surinamese/Nigerian personas (filter/browse works).
3. `african_market_farmer` remains South African accent gate (by design).
4. Clone voices still lack geography metadata.
5. Voices with zero provider signals remain unclassified (no fake data).

---

## Wat NIET opnieuw gebouwd moet worden

- ElevenLabs provider / TTS engine
- Voice Library schema or parallel catalog
- Persona preset strict accent gates
- Marketplace UI shell (cards already show geography/accent/locale)
- Compatibility engine structure
