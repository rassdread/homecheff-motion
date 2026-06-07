# Location Identity Builder UI Report

## Welke Identity Spec Engine functies zijn gebruikt

- `toIdentitySpec(location)` — form laden, completeness score, visual production hints
- `identityCompleteness(spec)` — completeness percentage + tier in UI
- `locationToIdentitySpec` / `locationFromIdentitySpec` — via engine round-trip (patch shape `LocationIdentitySpecPatch`)
- Geen nieuwe engine, geen schema migratie

## Hoe locatie-identiteit wordt bewerkt

Flow: **Locaties-tab → kies locatie → Location Identity panel → Opslaan → `locationIdentityFormToPatch` → `updateStudioLocationApi` (PATCH)**.

Geen redirect, geen aparte pagina. Component: `StudioWorkspaceLocationIdentityBuilder` in `studio-workspace-scene-assets-panel.tsx` (early return voor `tab === "locations"`, analoog aan characters).

Structured velden worden opgeslagen in `environmentKeywords` als `hc:key=value` tokens. Vrije tekst in `visualIdentity`, `worldMemory`, `continuityNotes` (usage + `[identity:forbidden]` marker).

## Hoe type, stijl en sfeer gescheiden zijn

| Concept | Form field | Opslag |
|---------|-----------|--------|
| Type (wat is het?) | `locationType` | `hc:type=` + derived `category` |
| Visuele stijl (hoe ziet het eruit?) | `visualStyle` | `hc:style=` |
| Sfeer (hoe voelt het?) | `mood` | `hc:mood=` |
| Gebruik | `usageContext` | `continuityNotes` (vóór forbidden marker) |

Architectuur, materialen, kleur, belichting en drukte hebben eigen presets en `hc:arch`, `hc:mat`, `hc:color`, `hc:light`, `hc:crowd`.

## Welke presets zijn toegevoegd

- **Types:** keuken, restaurant, markt, tuin, straat, woonkamer, studio, winkel, afhaalpunt, werkplaats, school, kantoor
- **Stijlen:** realistisch, cinematic, cartoon, 3D cartoon, documentary, minimalistisch, premium, warm lokaal, urban, nature (+ advanced)
- **Sfeer:** warm, gezellig, druk, rustig, professioneel, inspirerend, speels, luxe, ambachtelijk, community
- **Architectuur, materialen, belichting, drukte, kleurthema** — preset chips in accordion secties

## Hoe style preview cards werken

Statische CSS preview cards (`StudioLocationIdentityStylePreviewCard`) voor: warm lokaal, cinematic, cartoon, minimalistisch, urban, nature, premium. Geen image generation. Overige stijlen als compacte knoppen; advanced stijlen alleen voor admin / advanced features.

## Hoe AI proposal prefill werkt

`buildLocationIdentityAiSuggestion` leest AI Director proposal (`proposedLocation`, `locationRef`) en levert partial form values voor compare/prefill. Geen automatische overschrijving.

## Hoe current vs suggested werkt

Banner + accordion compare toont veld-voor-veld **Huidig / AI-voorstel** met knop **Gebruik voorstel** (`mergeLocationIdentityForm`). Alleen bij echte verschillen (`hasLocationIdentitySuggestion`).

## Hoe world integration werkt

World dropdown in context-sectie; slaat op via `worldProfileId` in PATCH. Geen World Builder.

## Hoe visual production aansluit

- `buildLocationIdentityVisualProductionLines(spec)` — structured identity lines voor planners/prompts
- `buildLocationIdentityMemoryPromptExtras` — wired in `buildLocationMemoryPromptLines`
- `buildLocationIdentityPromptContext` — optional second arg op `buildLocationPrompt`

Geen wijziging aan image generation providers.

## Hoe shot planner aansluit

- `resolveLocationIdentityShotHint` / `resolveLocationIdentityShotHintFromLocation` — type → preferred shot types (markt → wide, keuken → close-up, straat → tracking, etc.)
- `buildLocationPlan` in scene composition director leest `locationType` uit identity voor environment focus

Geen nieuwe shot planner engine; read-only hints voor downstream consumers.

## Welke advanced styles verborgen zijn

Cyberpunk, fantasy, dark fantasy, horror, dystopian, sci-fi, noir, experimental — alleen zichtbaar met `isAdmin` of `useStudioAdvancedFeatures()`.

## Welke bestanden zijn aangepast

**Nieuw:**
- `src/lib/studio-location-identity-presets.ts`
- `src/lib/studio-location-identity-fields.ts`
- `src/lib/studio-location-identity-suggestion.ts`
- `src/lib/studio-location-identity-visual-hints.ts`
- `src/lib/studio-location-identity-foundation.test.ts`
- `src/components/studio/studio-location-identity-style-preview.tsx`
- `src/components/studio/studio-workspace-location-identity-builder.tsx`
- `docs/studio-location-identity-builder-ui-report.md`

**Gewijzigd:**
- `src/components/studio/studio-workspace-scene-assets-panel.tsx`
- `src/components/studio/studio-workspace-shell.tsx`
- `src/lib/studio-memory-prompt.ts`
- `src/lib/studio-prompt-location-builder.ts`
- `src/lib/studio-scene-composition-director.ts`
- `src/i18n/locales/en.ts`
- `src/i18n/locales/nl.ts`

## Wat bewust niet gebouwd is

- Geen nieuwe identity engine, schema migratie, providers
- Geen image generation, upload-to-identity extraction
- Geen prop/world builders
- Geen aparte locatie-identiteit pagina

## Wat de volgende sprint moet zijn

- **Prop Identity Builder** — derde UI-consumer van Identity Spec Engine
- Optioneel: dieper shot planner wiring wanneer scene flow location type meeneemt
- Optioneel: Asset Evolution location identity diff UI (parallel aan character)

## Tests/build status

- `npx prisma validate` — ok
- `npx prisma generate` — ok
- `npm run lint` — ok (0 errors)
- `npm run build` — ok
- `npm run test` — **1612/1612 pass** (+9 location identity foundation tests)
