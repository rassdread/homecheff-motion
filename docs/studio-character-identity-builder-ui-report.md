# Character Identity Builder UI Report

> Studio V2 — first UI consumer of the Identity Spec Engine (commit `218900f`).

---

## Welke Identity Spec Engine functies zijn gebruikt

| Engine functie | Gebruik in UI |
|----------------|---------------|
| `toIdentitySpec(character)` | Form laden vanuit library character |
| `fromIdentitySpec` | Indirect via `characterIdentityFormToPatch` → PATCH body |
| `toMemorySnapshot` | Niet direct in UI (engine tests blijven de bron) |
| `fromMemorySnapshot` | Niet direct in UI |
| `toSearchHaystack` | Niet in UI (director/recurring blijven server-side) |
| `identityCompleteness(spec)` | Completeness-balk + tier (Compleet / Bijna / Mist nog) |

---

## Hoe personage-identiteit wordt bewerkt

**Flow:**

```
Personages-tab (workspace)
  → kies personage (dropdown)
  → accordion-secties (mobile-friendly)
  → Opslaan
  → characterIdentityFormToPatch(form)
  → updateStudioCharacterApi (bestaande PATCH)
```

**Component:** `StudioWorkspaceCharacterIdentityBuilder`  
**Wiring:** `StudioWorkspaceSceneAssetsPanel` (characters tab, geen redirect)

Structured velden (type, stijl, vorm, energie, kleur) worden opgeslagen in **`visualKeywords`** als `hc:key=value` tokens. Gebruik + verboden elementen in **`continuityNotes`** met `[identity:forbidden]` marker. Kleding/accessoires/personality in bestaande memory-velden.

---

## Hoe type en stijl gescheiden zijn

| UI concept | Opslag |
|------------|--------|
| **Type** (Mens, Mascotte, Robot, …) | `hc:type=…` + mapped `role` |
| **Visuele stijl** | `hc:style=…` |
| **Vormtaal** | `hc:shape=…` |
| **Energie** | `hc:energy=…` |
| **Kleurthema** | `hc:color=…` |
| **Persoonlijkheid** | `personality` + `personalityMemory` |
| **Visuele details** | `appearanceMemory` |

Parser/encoder: `src/lib/studio-character-identity-fields.ts`

---

## Welke presets zijn toegevoegd

Gedefinieerd in `src/lib/studio-character-identity-presets.ts`, labels via i18n:

- **Personality:** Warm, Energiek, Grappig, … (8)
- **Outfit:** Chef, Garden, Designer, … (8)
- **Accessories:** Lepel, Mand, Telefoon, … (9)
- **Color theme:** HomeCheff, Warm, Aarde, … (8)

Presets vullen velden — geen generator, geen auto-save.

---

## Hoe style preview cards werken

`StudioCharacterIdentityStylePreviewCard` — CSS gradient + shape tokens (geen afbeeldingen, geen AI):

- Flat cartoon, 3D cartoon, Comic, Storybook, Cinematic
- Beschrijving + “Past goed voor…” via i18n

Overige stijlen: compacte select-knoppen.

---

## Hoe AI proposal prefill werkt

`buildCharacterIdentityAiSuggestion()` — leest storyboard `aiDirectorPrompt`, roept bestaande `buildDirectorProposal` aan, matcht proposed characters / refs.

Toont **Huidig vs AI-voorstel** wanneer velden verschillen. **Gebruik voorstel** merged in form; gebruiker moet nog **Opslaan** klikken.

---

## Hoe current vs suggested werkt

Compare-sectie in builder wanneer `hasCharacterIdentitySuggestion()` true is. Per gewijzigd veld: current column + proposed column. Geen automatische overschrijving.

---

## Hoe voice identity aansluit

- Status: geen / preset / gekloond / vergrendeld (`resolveCharacterVoiceIdentityStatus`)
- Voice editing: bestaande `StudioWorkspaceCharacterVoiceInline` in Voice-sectie
- Geen nieuwe voice engine

---

## Hoe world integration werkt

Dropdown koppelt `worldProfileId` uit bestaande worlds library. Geen World Builder.

---

## Welke advanced styles verborgen zijn

Core (altijd zichtbaar): flat/2d/3d cartoon, comic, storybook, semi-realistic, cinematic, stylized.

Advanced (alleen `isAdmin` **of** `useStudioAdvancedFeatures()`): cyberpunk, steampunk, noir, fantasy, horror, sci-fi, experimental, …

Geen betaalmuur — visibility flag only.

---

## Welke bestanden zijn aangepast

**Nieuw:**

- `src/lib/studio-character-identity-presets.ts`
- `src/lib/studio-character-identity-fields.ts`
- `src/lib/studio-character-identity-suggestion.ts`
- `src/lib/studio-character-identity-foundation.test.ts`
- `src/components/studio/studio-workspace-character-identity-builder.tsx`
- `src/components/studio/studio-character-identity-style-preview.tsx`
- `docs/studio-character-identity-builder-ui-report.md`

**Gewijzigd:**

- `src/components/studio/studio-workspace-scene-assets-panel.tsx`
- `src/components/studio/studio-workspace-shell.tsx`
- `src/i18n/locales/en.ts`, `nl.ts`
- `package.json`

---

## Wat bewust niet gebouwd is

- Location / Prop / World Identity Builders
- Upload → identity extraction
- Image generation / AI style preview
- Nieuwe identity engine of schema migratie
- Auto-save / auto-link van AI voorstellen

---

## Wat de volgende sprint moet zijn

1. **Location Identity Builder UI** (zelfde form/encoder pattern)
2. Asset evolution: “identity incompleet” hints via `identityCompleteness`
3. Character detail page (`/studio/characters/[id]`) — optioneel dezelfde builder embedden

---

## Tests/build status

| Check | Status |
|-------|--------|
| `npm run lint` | Pass (0 errors) |
| `npm run build` | Pass |
| `npm run test` | **1603/1603 pass** (6 character identity tests) |
