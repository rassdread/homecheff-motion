# Voice Accent & Persona Library Audit Report

**Date:** 2026-06-06  
**Scope:** Pure reality audit — geen code, geen migraties, geen nieuwe providers/TTS/clone-systemen.  
**Doel:** Vaststellen welke accent-, dialect- en persona-mogelijkheden **al** bestaan in de voice-stack, vóór nieuwe systemen.

---

## Samenvatting

| Bevinding | Conclusie |
|-----------|-----------|
| TTS via ElevenLabs | ✅ Live (`POST /v1/text-to-speech/{voice_id}`) |
| Voice clone (IVC) | ✅ Live (`POST /v1/voices/add` → `clone:<id>`) |
| Accent-selectie in Studio | ❌ **Niet aanwezig** |
| ElevenLabs voice list API | ❌ **Niet geïntegreerd** |
| Studio voice presets | 6 mood/role presets → 6 **hardcoded** voice IDs |
| Persona-laag | ❌ **Ontbreekt** |
| AI Director → accent mapping | ❌ **Niet mogelijk** |
| Accent via clone | ⚠️ **Impliciet** (accent volgt sample; geen regels) |

**Kern:** De technische basis (TTS, preview, character voice, clone refs, multi-language) is **aanwezig**. Accent- en persona-differentiatie ontbreekt vrijwel volledig in **data-consumptie en UI** — niet in ElevenLabs als platform. De grootste kans is **Voice Accent Library** = ElevenLabs voice list browsen + metadata (accent/gender/age) **consumeren**, geen nieuwe TTS-engine.

---

## Huidige voice-architectuur

```
Character (Prisma: voiceProfile, voiceLanguage, voiceGender, voiceDescription, voiceLock, voiceProfilesJson)
    ↓
resolveCharacterVoiceIdentity() / buildCharacterVoiceAssignment()
    ↓
Voice Profile Ref: preset ID ("warm_narrator") OR clone ref ("clone:<elevenLabsVoiceId>")
    ↓
getVoiceProfilePreset() → stability/similarity/style (presets only; clone → warm_narrator settings)
    ↓
buildVoiceRequest() → model eleven_multilingual_v2 + language_code
    ↓
resolveElevenLabsVoiceId() → hardcoded PROFILE_VOICE_IDS OR clone ID OR ELEVENLABS_VOICE_ID env
    ↓
selectVoiceProvider() → synthesizeElevenLabsSpeech()
    ↓
Blob storage → StudioStoryboardVoice / preview URL → Motion mux
```

**Parallelle planning-lagen (geen accent):**

- `analyzeVoiceDirector()` — script, timing, preset label
- `buildVoiceIdentityPlan()` — lock, multi-language rows, warnings
- AI Director proposal — `buildProposalVoiceSummary()` — enable/lock recommendations only

---

## Trace: Character → Audio Output

| Stap | Input | Output | Geconsumeerd? | Verloren / genegeerd? |
|------|-------|--------|---------------|------------------------|
| Character form | name, personality (text) | DB character | personality **niet** in voice pipeline | personality genegeerd voor stem |
| Voice Center UI | 6 preset dropdown | `voiceProfile` preset ID | ✅ TTS | Geen accent keuze |
| Per-language override | preset per nl/en/de/fr/es | `voiceProfilesJson` | ✅ resolver | Clone niet in dropdown; `normalizeStudioVoiceProfileId()` strip non-presets |
| `voiceGender` | free text (schema) | displayLabel only | UI label | **Niet** naar ElevenLabs |
| `voiceDescription` | free text | displayLabel; clone name | UI + history | **Niet** naar ElevenLabs API |
| `voiceNotes` | free text | stored | ❌ voice pipeline | Genegeerd |
| Voice clone | audio sample | `clone:<voice_id>` + description | ✅ `resolveElevenLabsVoiceId` | Preview path bug (zie Clone audit) |
| Storyboard | voiceProfile, voiceLanguage, narrationMode | single-narrator TTS | ✅ | Alleen presets op storyboard-niveau |
| ElevenLabs POST | text, voice_settings, language_code | MP3 | ✅ | accent/use_case labels van library **niet** meegestuurd |

---

## ElevenLabs audit (bewijs uit code)

| Vraag | Antwoord | Bewijs |
|-------|----------|--------|
| Hardcoded voice IDs? | **Ja** — 6 presets | `PROFILE_VOICE_IDS` in `src/lib/elevenlabs-voice.ts` L75–82 |
| Labels gebruikt? | Alleen Studio i18n preset labels | `studio.voice.preset.*` — geen ElevenLabs voice names |
| Voice categories? | **Nee** | Geen category field in codebase |
| Voice metadata? | **Nee** | Geen fetch/opslag van ElevenLabs voice metadata |
| Voice list API? | **Nee** | Geen `GET /v1/voices` / search in `src/` |
| Accents opgehaald? | **Nee** | Geen `accent` key anywhere in voice lib |
| Genders opgehaald? | **Nee** | `voiceGender` is user-typed character field only |
| Leeftijd? | **Nee** | — |
| Voice tags? | **Nee** | Clone upload stuurt optioneel `labels: { language }` only |

### Hardcoded preset → ElevenLabs voice ID mapping

```75:82:src/lib/elevenlabs-voice.ts
const PROFILE_VOICE_IDS: Record<string, string> = {
  warm_narrator: "21m00Tcm4TlvDq8ikWAM",      // Rachel — US English female
  documentary: "ErXwobaYiN019PkySvjV",         // Antoni — US English male
  commercial: "EXAVITQu4vr4xnSDxMaL",          // Bella — US English female
  inspirational_founder: "pNInz6obpgDQGcFmaJgB", // Josh — US English male
  premium_brand: "onwK4e9ZLuTAKqWW03F9",      // Daniel — British English male
  educational: "VR6AewLTigWG4xSOukaG",        // Arnold — US English male
};
```

**Resolutie-volgorde:** `ELEVENLABS_VOICE_ID` env (global override) → preset map → `clone:<id>` via `parseVoiceProfileRef()`.

**Wél live:** `language_code` in POST body (`elevenlabs-voice.ts` L133–135). Oudere audit-docs die beweren dat dit niet wordt gestuurd zijn **incorrect** voor huidige code.

**ElevenLabs platform (buiten onze code):** Voice Library bevat duizenden stemmen met metadata (accent, gender, age, use case). Dit is **via API beschikbaar** maar Studio **haalt het niet op**.

---

## Voice profile audit

### Bestaande velden

| Veld | Model | Gebruikt in TTS? | Gebruikt in UI? |
|------|-------|------------------|-----------------|
| `voiceProfile` | Character + Storyboard | ✅ → voice ID | ✅ preset dropdown / clone ref |
| `voiceLanguage` | Character + Storyboard | ✅ `language_code` | ✅ language select (nl/en/de/fr/es) |
| `voiceStyle` | Storyboard | ⚠️ derived from preset energy | storyboard editor |
| `voiceProvider` | Character | metadata (`elevenlabs`) | stored, selector mock/elevenlabs |
| `voiceGender` | Character | ❌ | displayLabel fallback only |
| `voiceDescription` | Character | ❌ | labels, clone name display |
| `voiceNotes` | Character | ❌ | — |
| `voiceLock` | Character | ✅ identity enforcement | ✅ checkbox |
| `voiceProfilesJson` | Character | ✅ per-language override | ✅ Voice Center per lang |
| `narrationMode` | Storyboard | ✅ → preset via `profileIdForNarrationMode` | director UI |
| Clone ref `clone:<id>` | Character | ✅ `resolveElevenLabsVoiceId` | ✅ clone panel |

### Studio preset catalog (enige “stemmen” in UI)

| Preset ID | UI label (EN) | Implied role | Accent in code |
|-----------|---------------|--------------|----------------|
| `warm_narrator` | Warm Narrator | General narrator | None (US default voices) |
| `documentary` | Documentary | Observational | None |
| `commercial` | Commercial | Upbeat promo | None |
| `inspirational_founder` | Inspirational Founder | Founder story | None |
| `premium_brand` | Premium Brand | Luxury | **de facto British** (Daniel ID) — **niet gelabeld** |
| `educational` | Educational | Explain | None |

Bron: `STUDIO_VOICE_PROFILE_IDS` + `studio.voice.preset.*` in `src/lib/studio-voice-profiles.ts` / i18n.

**Geen** Friendly Narrator als apart ID — dichtstbij: `warm_narrator`. **Geen** “Professional” / “Energetic” als preset IDs — energy komt uit `emotionProfile.energy` → `voiceStyleFromProfile()` (“energetic”, “authoritative”, “warm”).

---

## Accent audit (expliciet per regio)

Legenda: **EL** = ElevenLabs platform (API/library), **ST** = Studio product, **HC** = hardcoded preset map only.

### English variants

| Accent | EL library | ST UI/API | HC preset | Status |
|--------|------------|-----------|-----------|--------|
| British | ✅ many voices | ❌ | ⚠️ Daniel via `premium_brand` only | Theoretisch + 1 hidden mapping |
| Scottish | ✅ | ❌ | ❌ | EL only |
| Irish | ✅ | ❌ | ❌ | EL only |
| Australian | ✅ | ❌ | ❌ | EL only |
| New Zealand | ✅ | ❌ | ❌ | EL only |
| South African | ✅ | ❌ | ❌ | EL only |
| American | ✅ | ⚠️ default for 5/6 IDs | ✅ | De facto default |
| Southern American | ✅ | ❌ | ❌ | EL only |
| New York | ✅ | ❌ | ❌ | EL only |
| Canadian | ✅ | ❌ | ❌ | EL only |
| Jamaican | ✅ | ❌ | ❌ | EL only |
| Nigerian | ✅ | ❌ | ❌ | EL only |
| Indian English | ✅ | ❌ | ❌ | EL only |

### Dutch variants

| Accent | EL | ST | Status |
|--------|----|----|--------|
| Nederlands (standard) | ✅ | ⚠️ `language_code: nl` only | Taal, geen accent-keuze |
| Vlaams | ✅ | ❌ | EL only |
| Surinaams-Nederlands | ✅/partial | ❌ | EL only; geen Studio mapping |

### Spanish / French

| Variant | EL | ST |
|---------|----|----|
| Spain Spanish | ✅ | ❌ accent; `es` language only |
| Latin American Spanish | ✅ | ❌ |
| France French | ✅ | ❌ accent; `fr` language only |
| African French | ✅ | ❌ |
| Canadian French | ✅ | ❌ |

**Conclusie accent:** Studio onderscheidt **taal** (7 codes in validator: en, nl, de, fr, es, it, pt) — **niet accent/dialect**. Britse stemmen zijn **niet** productized; Jamaican/Australische/Surinaamse etc. **bestaan niet** in Studio.

---

## Persona audit

Gevraagde persona’s (British Chef, Jamaican Street Chef, Community Farmer, Amsterdam Streetwear Designer, etc.):

| Capability | Status |
|------------|--------|
| Persona entity in schema | ❌ |
| Persona → voice mapping | ❌ |
| Character `personality` text field | ✅ exists in character form — **not consumed** by voice director |
| Role-based presets (chef, farmer) | ❌ — only narration *mode* (documentary, commercial) |
| Location → voice inference | ❌ |
| AI Director mood keywords | ✅ cinematic, premium, energetic — **visual/style only** (`studio-ai-director-interpreter.ts`), not voice |

**Kan dit al met bestaande systemen?**

- **Gedeeltelijk via clone:** upload sample van gewenste persona/accent → `clone:<id>`. Geen library browse, geen persona labels.
- **Niet via presets:** 6 generic moods, geen chef/farmer/designer personas.
- **Persona-laag ontbreekt** — zou mapping zijn: `{ personaId, accentTag, elevenLabsVoiceId, previewUrl }` bovenop bestaande TTS.

---

## AI Director voice audit

**Kan AI Director stemmen aanbevelen?** ⚠️ **Minimaal.**

`buildProposalVoiceSummary()` in `studio-director-proposal-builder.ts`:

- Leest character voice identity + preset label
- Recommendation keys: `enableCharacter`, `respectLock` only
- Story voice from `analyzeVoiceDirector()` → `profileIdForNarrationMode(narrationMode)` → 6 presets

**Kan Director kiezen:**

| Mapping | Mogelijk? |
|---------|-----------|
| Jamaica → Jamaican English | ❌ Geen location→voice data |
| London → British English | ❌ |
| Community Garden → Caribbean narrator | ❌ |
| Pixar → energetic commercial preset | ⚠️ Indirect via `interpretAiDirectorPrompt` → narration **mode**, not voice ID |

**Ontbrekende consumptie:** story location, character role, production brief world, accent tags, ElevenLabs voice metadata, persona catalog.

`interpretAiDirectorPrompt()` heeft **geen** voice/accent output fields.

---

## Voice clone audit

**Status:** ✅ Geïmplementeerd (zie `docs/studio-voice-clone-foundation-report.md`).

| Vraag | Antwoord |
|-------|----------|
| Clone flow | Upload sample → `POST /v1/voices/add` → `voiceProfile = clone:<id>` |
| Accent | **Volgt sample** — geen expliciet accent veld; optional `labels: { language }` |
| Taal wisselen | ⚠️ `language_code` bij TTS; clone zelf fixed aan sample karakter |
| Accent wisselen | ❌ geen regels; nieuwe clone nodig |
| Persona wisselen | ❌ zelfde |
| TTS settings voor clone | `warm_narrator` preset stability/similarity — **niet** persona-specific |

### Bekende consumptie-gap (bewijs)

`generateCharacterVoicePreview()` en `synthesizeCharacterVoicePreview()` gebruiken `normalizeStudioVoiceProfileId()` op `voiceProfile`. Clone refs (`clone:xxx`) zijn **geen** preset ID → vallen terug naar `warm_narrator` → **verkeerde voice_id bij preview** tenzij `voiceProfile` expliciet als override wordt doorgegeven én normalisatie wordt vermeden.

Full storyboard **multi-character** generation gebruikt `buildCharacterVoiceAssignment()` → `normalizeStoredVoiceProfile()` → clone **behouden**.

Single-narrator storyboard path gebruikt `analyzeVoiceDirector()` → alleen storyboard preset, geen character clone.

---

## User experience audit

### Stem kiezen (character)

Typical path: Workspace → Characters / Voice tab → expand character inline → Voice Center

| Actie | Klikken / stappen | Friction |
|-------|-------------------|----------|
| Enable voice | 1 checkbox | Low |
| Kies preset | 1 dropdown (6 options) | **Geen accent browse** |
| Per-taal override | Expand language row → second dropdown | Medium |
| Save | Auto-save debounce in inline panel | OK |
| **Totaal stem kiezen** | ~3–5 interactions | Limited choice, geen search |

### Stem beluisteren

| Path | Stappen |
|------|---------|
| Voice Center preview | Enable → optional edit text → Preview per language (~2 clicks) |
| Draft preview (unsaved character) | `POST /voice-preview-draft` |
| Director V2 scene | Preview button → POST voice-preview (~1 click) |
| Storyboard generate | Voice tab → generate narration (separate flow) |

**Friction:** Geen side-by-side accent compare; geen “browse library”; preview van **clone** kan verkeerde preset ID gebruiken (bug).

### Clone maken

| Step | UI |
|------|-----|
| 1 | Open character voice inline (expand) |
| 2 | Scroll to Clone panel |
| 3 | Upload sample + consent checkbox |
| 4 | Enter voice name |
| 5 | Clone button |
| 6 | Optional result preview |

**~6+ interactions** — reasonable, but **no guidance** on accent/persona quality; no sample length hints in audit scope beyond validation (15MB, mp3/wav/m4a).

### Waar gebruikers vastlopen

1. **Verwachting vs realiteit:** “British narrator” niet vindbaar — alleen 6 generic labels  
2. **Clone vs preset:** Clone not shown in preset dropdown; separate panel  
3. **Per-language:** 5 languages × separate preview — labor intensive  
4. **AI Director:** Suggests enable voice, not *which* voice/accent  
5. **Docs drift:** Some audits say clone not built — feature exists but undiscoverable  

---

## Grootste kans (A / B / C / D)

| Optie | Waarde | Inspanning | Onderbouwing |
|-------|--------|------------|--------------|
| **A — Voice Accent Library** | **Hoogst** | Medium (API + UI) | TTS, preview, character assignment, clone refs **bestaan**. ElevenLabs levert accent/gender/age metadata. Alleen **consumptie + picker** — geen nieuwe engine. |
| **B — Voice Persona Library** | Hoog | Medium–hoog | Vereist curated mapping (Chef/Jamaican/…) → voice IDs + copy. Bouwt op A; geen persona schema today. |
| **C — Voice Marketplace** | Laag | Zeer hoog | Tegen V2 architectuur (“not a marketplace”) — `studio-v2-architecture-plan.md` |
| **D — Clone improvements** | Medium | Laag–medium | Fix preview normalisatie; accent = sample; beperkt tot user-provided voices |

**Aanbeveling: A eerst, dan B als curated layer over dezelfde voice IDs.**

Britse / Jamaicaanse / Australische / Afrikaanse / Surinaamse stemmen **zonder nieuwe technologie:** haalbaar via **ElevenLabs library browse + filter op accent labels** — niet via huidige 6 presets.

---

## Aanbevolen volgende sprint

**Voice Library Consumption Sprint** (geen nieuwe TTS, geen nieuwe provider):

1. `GET /v1/voices` (of search) server-side cache — accent, gender, age, labels  
2. Character Voice Center: **library picker** naast 6 presets — filter op language + accent  
3. Fix `normalizeStudioVoiceProfileId()` in preview paths → `normalizeStoredVoiceProfile()` voor clone refs  
4. Toon metadata in UI (British, Jamaican, etc.) — consume ElevenLabs labels  
5. Optioneel: map `premium_brand` → label “British (Daniel)” for honesty  
6. AI Director: recommend voice **IDs** from library when brief mentions location (heuristic, no new AI)  

---

## Expliciet NIET bouwen (deze sprint)

- Geen nieuwe TTS engine of voice provider  
- Geen Suno/Udio voor voice personas  
- Geen schema migratie voor `accent` column (use ElevenLabs voice ID + metadata cache)  
- Geen Voice Marketplace / user-upload voice store  
- Geen LLM “persona voice generator”  
- Geen dubbing/STS stack tenzij apart auditeerd  

---

## Validatie

Audit via code trace in:

- `src/lib/studio-voice-profiles.ts`
- `src/lib/elevenlabs-voice.ts`
- `src/lib/elevenlabs-voice-clone.ts`
- `src/lib/studio-voice-profile-ref.ts`
- `src/lib/studio-voice-identity-resolver.ts`
- `src/lib/studio-voice-identity-director.ts`
- `src/lib/studio-voice-director.ts`
- `src/lib/studio-character-voice.ts`
- `src/components/studio/studio-character-voice-center.tsx`
- `src/components/studio/studio-character-voice-clone-panel.tsx`
- `src/server/studio/generate-storyboard-voice.ts`
- `src/server/studio/generate-character-voice-preview.ts`
- `src/server/studio/clone-character-voice.ts`
- `prisma/schema.prisma` (character voice fields)
- `docs/elevenlabs-capability-audit.md`
- `docs/studio-voice-clone-foundation-report.md`

Geen code gewijzigd. Geen aannames over ElevenLabs library inhoud zonder API — platform capability based on public ElevenLabs Voice Library documentation; Studio integration based on repo evidence.

---

## Gerelateerde documenten

- [ElevenLabs Capability Audit](./elevenlabs-capability-audit.md)
- [Studio Audio Foundation Reality Audit](./studio-audio-foundation-reality-audit.md)
- [Voice Clone Foundation Report](./studio-voice-clone-foundation-report.md)
- [Voice Identity & Audio Production Report](./voice-identity-audio-production-report.md)
