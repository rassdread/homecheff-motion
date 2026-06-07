# Prop Identity Builder UI Report

## Welke Identity Spec Engine functies zijn gebruikt

- `toIdentitySpec(prop)` — form laden, completeness score, visual production hints
- `identityCompleteness(spec)` — completeness percentage + tier in UI
- `propToIdentitySpec` / `propFromIdentitySpec` — patch shape `PropIdentitySpecPatch`
- `propToIdentitySpec` updated: structured `hc:` tokens extracted from `appearanceMemory` → `visualKeywords`
- Geen nieuwe engine, geen schema migratie

## Hoe prop-identiteit wordt bewerkt

Flow: **Props-tab → kies prop → Prop identity panel → Opslaan → `propIdentityFormToPatch` → `updateStudioPropApi` (PATCH)**.

Geen redirect, geen aparte pagina. Component: `StudioWorkspacePropIdentityBuilder` in `studio-workspace-scene-assets-panel.tsx` (early return voor `tab === "props"`).

Structured velden in `appearanceMemory` als `hc:key=value` tokens. Vrije visuele details na `[identity:details]` marker. Forbidden → `brandingRules`. Usage → `continuityNotes`. Character links → `hc:chars=id1|id2`.

## Hoe type en functie gescheiden zijn

| Concept | Form field | Opslag |
|---------|-----------|--------|
| Type (wat is het?) | `propType` | `hc:type=` + derived `category` |
| Functie (waarvoor?) | `propFunction` | `hc:func=` |
| Gebruik (context) | `usageContext` | `continuityNotes` |

Vormtaal, materiaal, kleur, grootte, stijl: eigen presets + `hc:shape`, `hc:mat`, `hc:color`, `hc:size`, `hc:style`.

## Welke presets zijn toegevoegd

- **Types:** gereedschap, sport, voedsel, elektronica, kleding, transport, decoratie, muziek, speelgoed, zakelijk
- **Functies:** koken, bezorgen, sporten, presenteren, ontwerpen, reizen, verkopen, oogsten, leren, entertainment
- **Vormtaal:** rond, compact, minimalistisch, robuust, premium, speels, industrieel
- **Materialen:** hout, metaal, plastic, glas, stof, papier, leer, steen
- **Grootte-indruk:** klein, handheld, middel, groot, zeer groot
- **Stijl preview cards:** ambachtelijk, modern, premium, industrieel, speels, minimalistisch
- **Kleurthema** preset chips

## Hoe style preview cards werken

Statische CSS cards (`StudioPropIdentityStylePreviewCard`) voor alle zes stijlen. Geen image generation.

## Hoe AI proposal prefill werkt

`buildPropIdentityAiSuggestion` leest AI Director proposal (`proposedProps`, `propRefs`). Alleen compare/prefill — geen auto-save.

## Hoe current vs suggested werkt

Banner + side-by-side **Huidig / AI-voorstel** + knop **Gebruik voorstel** (`mergePropIdentityForm`).

## Hoe character linking werkt

- Handmatige multi-select chips voor alle library characters
- `hc:chars=` opslag in structured appearance memory
- Heuristische suggesties via `suggestPropLinkedCharacters` (sport → mascot, lepel/koken → chef, mand/oogst → garden) — **nooit automatisch**, alleen suggestion chips

## Hoe world integration werkt

World dropdown → `worldProfileId` in PATCH. Geen World Builder.

## Hoe shot planner aansluit

- `resolvePropIdentityShotHint` / `resolvePropIdentityShotHintFromProp` — lepel/tool → close-up, sport → actie, pakket/bezorg → handoff
- Read-only hints voor downstream consumers; geen nieuwe shot engine

## Welke bestanden zijn aangepast

**Nieuw:**
- `src/lib/studio-prop-identity-structured.ts`
- `src/lib/studio-prop-identity-presets.ts`
- `src/lib/studio-prop-identity-fields.ts`
- `src/lib/studio-prop-identity-suggestion.ts`
- `src/lib/studio-prop-identity-character-suggestions.ts`
- `src/lib/studio-prop-identity-visual-hints.ts`
- `src/lib/studio-prop-identity-foundation.test.ts`
- `src/components/studio/studio-prop-identity-style-preview.tsx`
- `src/components/studio/studio-workspace-prop-identity-builder.tsx`
- `docs/studio-prop-identity-builder-ui-report.md`

**Gewijzigd:**
- `src/components/studio/studio-workspace-scene-assets-panel.tsx`
- `src/components/studio/studio-workspace-shell.tsx`
- `src/lib/studio-identity-spec-mappers.ts`
- `src/lib/studio-memory-prompt.ts`
- `src/lib/studio-prompt-prop-builder.ts`
- `src/i18n/locales/en.ts`
- `src/i18n/locales/nl.ts`
- `package.json` (test script)

## Wat bewust niet gebouwd is

- Geen nieuwe identity engine, schema migratie, providers
- Geen image generation, upload extraction
- Geen World Builder
- Geen automatische character koppelingen
- Geen aparte prop-identiteit pagina

## Wat de volgende sprint moet zijn

- **World Identity Builder** (vierde UI-consumer) of dieper Asset Evolution identity diff UI
- Optioneel: Render Strategy Planner + Character Capabilities consumption van prop `hc:chars` links
- Optioneel: prompt builder wiring met `sourceProps` in alle call sites

## Tests/build status

- `npx prisma validate` — ok
- `npx prisma generate` — ok
- `npm run lint` — ok (0 errors)
- `npm run build` — ok
- `npm run test` — **1620/1620 pass** (+8 prop identity foundation tests)
