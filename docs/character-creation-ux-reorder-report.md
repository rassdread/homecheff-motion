# Character Creation UX Reorder Report

## Gewijzigde volgorde

Create op `/studio/characters/new` begint met **"Wat wil je doen?"** (tenzij Build New-prefill actief is — dan start Flow A direct).

| Fase | Flow A — Ontwerpen | Flow B — Bestaande afbeelding |
|------|-------------------|------------------------------|
| 1 | Entry-keuze (of auto design bij prefill) | Entry-keuze |
| 2 | Discovery-banner + Identity Builder (open) | Upload referentieafbeelding |
| 3 | Referentieafbeelding (Stap 2) | Identity Builder + Voice |
| 4 | Performance + opslaan | Performance + opslaan |

Edit blijft: upload → identity → performance (geen entry-keuze).

## Flow A (Ontwerpen)

Na keuze **Ontwerp nieuw personage**:

- Discovery: ✨ *Ontwerp je personage — Kies type, stijl, kleuren, outfit en stem.*
- `StudioCharacterIdentityBuilder` direct zichtbaar met accordions open: **kern**, **stijl**, **persoonlijkheid**, **stem**
- Style preview cards en type-/persoonlijkheidspresets direct zichtbaar in open secties
- Voice Library in voice-accordion (standaard open)
- Referentieafbeelding **onder** identity builder als **Stap 2** met copy: *Upload een referentieafbeelding van dit personage.*
- Opslaan vereist nog steeds referentieafbeelding (bestaande API-validatie)

## Flow B (Bestaande afbeelding)

Na keuze **Gebruik bestaande afbeelding**:

- Discovery: 📷 *Gebruik een bestaande afbeelding*
- Upload bovenaan (zoals voorheen)
- Daarna Identity Builder (kern + stem open)
- Performance + opslaan

## Welke bestaande componenten zijn hergebruikt

- `StudioCharacterForm` — entry-keuze, sectie-herordening, prefill-banner
- `StudioCharacterIdentityBuilder` — multi-expand accordions, flow-specifieke copy, prefill-veldbadges
- `StudioCharacterVoiceProfilePanel` + `VoiceLibraryProvider` + `UserVoiceLibraryProvider` — ongewijzigd, voice-accordion open op create
- `StudioCharacterPerformanceProfilePanel` / `StudioCharacterMouthAnimationPanel` — ongewijzigd
- Bestaande upload via `postWizardImageUpload` + `preprocessImageFile`
- Build New prefill via `readIdentityPrefillForKind`, `buildCharacterDetailFromPrefill`, `buildCharacterIdentitySuggestionFromPrefill`

## Workspace consistency

- `StudioWorkspaceAssetCreateSheet` (character): prominente link naar `/studio/characters/new` voor volledige identiteit, stijl en Voice Library. Minimale quick-create sheet blijft voor props/locaties/werelden.
- `StudioWorkspaceSceneAssetsPanel`: knop **Nieuw personage** linkt naar `/studio/characters/new` i.p.v. alleen de minimale sheet.

## Screens verwijderd

Geen. Geen nieuwe routes of pagina's. Alleen herordening op bestaande create-pagina.

## Nieuwe zichtbaarheid van presets

- Flow A opent **stijl**- en **persoonlijkheid**-accordions → style preview cards, shape/energy selects en personality presets direct zichtbaar
- **Kern**-accordion open → character type select zichtbaar
- Build New: amber banner *Gebaseerd op jouw verhaalidee* + *voorgesteld*-badge op prefill-velden + bestaande AI-voorstel-vergelijking

## Nieuwe zichtbaarheid van Voice Library

- Voice-accordion standaard **open** op create (design: core/style/personality/voice; existing: core/voice)
- Persona & bibliotheek-tab blijft default in `StudioCharacterVoiceProfilePanel` (ongewijzigd)

## Validatie

```bash
npm run lint
npm run build
npm run test
```

Geen nieuwe AI, image generation, providers, schema migraties, Identity Builder, Voice Library, preset-engine of Character API.
