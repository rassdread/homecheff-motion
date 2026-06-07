# Character Identity Builder Create/Edit Integration Report

## Root cause

`StudioWorkspaceCharacterIdentityBuilder` was architecturally workspace-only: mounted exclusively from `studio-workspace-scene-assets-panel.tsx` (Assets → Personages tab). Create/Edit routes (`/studio/characters/new`, `/studio/characters/[id]/edit`) used `StudioCharacterForm` with only basic fields (name, role, description, personality, reference image, voice, performance). Identity presets, style preview cards, world selector, forbidden elements, usage context, and AI compare were never mounted on those routes. Build New prefill only mapped name/description/personality/usageContext — not structured identity fields (`visualKeywords`, type, style, etc.).

## Welke bestaande systemen zijn hergebruikt

| System | Hergebruik |
|--------|------------|
| `StudioWorkspaceCharacterIdentityBuilder` UI | Geëxtraheerd naar gedeelde `StudioCharacterIdentityBuilder` |
| `studio-character-identity-presets.ts` | Ongewijzigd — type, stijl, vorm, energie, outfit, accessoires, kleur |
| `studio-character-identity-fields.ts` | `characterIdentityFormFromCharacter`, `characterIdentityFormToPatch`, `identityCompleteness` via preview helper |
| `studio-character-identity-suggestion.ts` | Workspace AI compare + nieuwe `buildCharacterIdentitySuggestionFromPrefill` voor Build New |
| `studio-character-identity-style-preview.tsx` | CSS preview cards op create/edit |
| `characterIdentityFormToPatch` → create/update API | Bestaande memory-velden, geen schema migratie |
| Voice Library | `VoiceLibraryProvider` + `UserVoiceLibraryProvider` + `StudioCharacterVoiceProfilePanel` in identity builder voice-sectie |
| Advanced styles gating | `isAdmin \|\| useStudioAdvancedFeatures()` in gedeelde builder |

## Hoe create mode werkt

`/studio/characters/new` → `StudioCharacterForm` → `StudioCharacterIdentityBuilder mode="create"`. Gebruiker ziet accordion-secties (kern, stijl, persoonlijkheid, look, context, stem) met presets en style preview cards. Opslaan via `studioCharacterFormToCreatePayload()` → `createStudioCharacterApi` met identity memory-velden (`visualKeywords`, `appearanceMemory`, `defaultClothing`, `continuityNotes`, `worldProfileId`, etc.).

## Hoe edit mode werkt

`/studio/characters/[id]/edit` → zelfde builder `mode="edit"`. Form geladen via `characterIdentityFormFromCharacter(initial)`. Opslaan via `studioCharacterFormToUpdatePayload()` → `updateStudioCharacterApi`.

## Hoe workspace mode behouden blijft

`StudioWorkspaceCharacterIdentityBuilder` is een dunne wrapper: character selector, save-knop, workspace voice inline, storyboard AI suggestion. Delegeert UI naar `StudioCharacterIdentityBuilder mode="workspace"`. Geen gedragswijziging voor bestaande workspace-flow.

## Hoe presets zichtbaar zijn

Alle preset-chips (persoonlijkheid, outfit, accessoires, kleurthema) en dropdowns (type, vorm, energie) renderen in de gedeelde builder op create/edit — dezelfde catalogi als workspace.

## Hoe style preview cards zichtbaar zijn

`StudioCharacterIdentityStylePreviewCard` grid in stijl-sectie; `listVisibleCharacterStyles(showAdvancedStyles)` respecteert admin/advanced toggle.

## Hoe build-new prefill werkt

`IdentityBuilderPrefill` uitgebreid met `characterType`, `visualStyle`, `shapeLanguage`, `energy`, `colorTheme`, `worldProfileId`. `buildIdentityPrefillFromDecision` vult type + optioneel wereld/stijl. `buildCharacterDetailFromPrefill` encodeert identity via `characterIdentityFormToPatch`. Create page doorgeeft `identityPrefill` voor AI compare (geen auto-apply).

## Hoe AI suggestions werken

- **Workspace:** ongewijzigd — `buildCharacterIdentityAiSuggestion` + compare wanneer storyboard + character context.
- **Create/edit:** wanneer `identityPrefill` aanwezig → `buildCharacterIdentitySuggestionFromPrefill`; compare alleen zichtbaar als er veldverschillen zijn (`hasCharacterIdentityFormSuggestion`). Gebruiker klikt "Gebruik voorstel" — geen auto-apply.

## Hoe identity velden opgeslagen worden

`characterIdentityFormToPatch(form.identity)` → structured `visualKeywords` (`hc:type=`, `hc:style=`, etc.), `defaultClothing`/`defaultAccessories`, `continuityNotes` (usage + forbidden marker), `worldProfileId`, `appearanceMemory`, `personalityMemory`. Geen nieuwe mapper; bestaande PATCH/create validation.

## Hoe voice integration behouden blijft

Voice blijft in identity builder voice-sectie, gewrapped met `VoiceLibraryProvider` + `UserVoiceLibraryProvider`. Persona & bibliotheek, Mijn Stemmen, preview en clone flow ongewijzigd. Workspace gebruikt nog `StudioWorkspaceCharacterVoiceInline`.

## Welke bestanden zijn aangepast

| Bestand | Wijziging |
|---------|-----------|
| `src/components/studio/studio-character-identity-builder.tsx` | **Nieuw** — gedeelde builder (create/edit/workspace) |
| `src/components/studio/studio-workspace-character-identity-builder.tsx` | Refactor → dunne workspace wrapper |
| `src/components/studio/studio-character-form.tsx` | Identity builder + payload helpers |
| `src/app/studio/characters/new/page.tsx` | Identity payload + prefill prop |
| `src/app/studio/characters/[id]/edit/page.tsx` | Identity update payload |
| `src/lib/studio-character-identity-fields.ts` | `emptyCharacterIdentityForm`, `characterListItemPreviewFromIdentityForm` |
| `src/lib/studio-character-identity-suggestion.ts` | `buildCharacterIdentitySuggestionFromPrefill`, `hasCharacterIdentityFormSuggestion` |
| `src/lib/studio-identity-builder-prefill-detail.ts` | Verrijkte prefill → detail |
| `src/lib/studio-asset-decision-execution.ts` | Verrijkte `buildIdentityPrefillFromDecision` |
| `src/types/studio-asset-decision.ts` | Uitgebreide `IdentityBuilderPrefill` |
| `src/i18n/locales/nl.ts`, `en.ts` | Create identity headings |
| `src/lib/studio-character-identity-create-edit-integration.test.ts` | **Nieuw** — integratietests |
| `package.json` | Test script entry |

## Wat bewust niet gebouwd is

- Geen image generator
- Geen nieuwe AI/provider
- Geen schema migratie
- Geen dubbele preset-engine
- Geen auto-apply van AI/prefill
- Geen auto-save

## Wat P1 blijft

- E2E smoke voor identity builder op create/edit (handmatig verifiëren in browser)
- Storyboard-context AI suggestion op create/edit (nu alleen prefill-context; workspace heeft volledige storyboard AI)
- Optioneel: wereld/stijl afleiden uit storyboard memory in `buildIdentityPrefillFromDecision` wanneer beschikbaar

## Tests/build status

| Check | Status |
|-------|--------|
| `npx prisma validate` | ✅ |
| `npx prisma generate` | ✅ |
| `npm run lint` | ✅ (0 errors) |
| `npm run build` | ✅ |
| `npm run test` | ✅ **1923/1923** |
