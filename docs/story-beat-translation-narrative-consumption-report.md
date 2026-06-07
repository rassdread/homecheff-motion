# Story Beat Translation & Narrative Consumption Report

**Date:** 2026-06-06  
**Scope:** Consumption layer between Story Architect and Director Proposal — no new AI, planners, tabs, engines, or schema migrations.

---

## Samenvatting

Studio gebruikt Story Architect-data nu **daadwerkelijk** voor unieke scènecopy. De nieuwe consumptielaag `studio-scene-beat-translation.ts` vertaalt narrative moments naar moment-specifieke i18n-templates, distilleert prompt-entiteiten, en dedupliceert vergelijkbare scènes.

**Vóór:** 5× dezelfde `{topic}` / `{message}` in vaste arc-shells.  
**Na:** 5 unieke titels + beschrijvingen via beat translation variants, met `{subject}`, `{setting}`, `{focus}` per moment.

---

## Beat Consumption Audit (Prioriteit 1)

| Data | Status vóór sprint | Nu geconsumeerd door |
|------|-------------------|----------------------|
| `storyMoments` | Alleen `moment.id` → oude scene templates | `translateStoryBeatForScene()` — volledige moment |
| `beatKey` | UI panel only | Referentie op proposal (`beatKey` field); copy via beat translation keys |
| `beatParams` | Gedeeld over alle scènes | `buildMomentSceneParams()` — per-moment `focus`, distilled goal/message |
| `narrativeFlow` | Idea prefix only | Onveranderd (context enrichment) |
| `message` | Raw topic copy | `distillMessage()` → `{message}` zonder meta-prefix |
| `theme` | Ongebruikt in scene i18n | In scene params; variant-selectie |
| `storyGoal` | `"Share {topic}"` overal | `distillGoal()` → `{storyGoal}` / `{subject}` |

Geen nieuwe data toegevoegd — alleen betere consumptie van bestaande velden.

---

## Hoe Beat Translation werkt (Prioriteit 2)

**Module:** `src/lib/studio-scene-beat-translation.ts`

Flow per scène:

```
pickStoryMomentForPhase(architecture, arcPhase)
    ↓
extractProposalStoryEntities(idea, brief, architecture, tokens)
    ↓
translateStoryBeatForScene({ moment, entities, sceneIndex })
    ↓
beatTranslationTemplateKeys(momentId, variantIndex)
    → studio.storyArchitect.beatTranslation.{moment}.{title|description|action}.{0|1|2}
    ↓
buildMomentSceneParams() → unieke params per scène
```

**Voorbeeld NL titels (geen `{topic}`-shell meer):**

| Moment | Varianten |
|--------|-----------|
| Departure | "Vertrek — {subject}", "De eerste stap", "Op weg naar {setting}" |
| Discovery | "Eerste ontmoeting", "Nieuwe omgeving", "Verborgen plek ontdekt" |
| Conflict | "Uitdaging", "Tegenslag", "De spanning loopt op" |
| Breakthrough | "Doorbraak", "Beslissend moment", "Het hoogtepunt" |
| Closing | "Resultaat", "Terugblik", "Nieuwe toekomst" |

Variant 2 (character/setting-afhankelijk) wordt automatisch vermeden wanneer entiteit ontbreekt.

---

## Unieke Scene Params (Prioriteit 3)

`buildMomentSceneParams()` levert per scène:

- `subject` — gedistilleerd verhaal (meta-prefix `"Een filmpje waar ik…"` gestript)
- `setting` — brief / place name / pattern heuristiek
- `character`, `prop` — brief + pattern heuristiek
- `focus` — moment-specifiek (bijv. conflict → `"spanning rond {subject}"`)
- `storyGoal`, `message` — gedistilleerd, niet raw topic
- `scene`, `scenes`, `moment`

`sceneParamsFromStoryArchitecture()` delegeert naar `buildMomentSceneParams()` wanneer entities meegegeven worden.

---

## Asset Extractie (Prioriteit 4)

`suggestNewAsset()` gebruikt `suggestAssetNameFromEntities()`:

| Type | Naam-bron |
|------|-----------|
| Character | `entities.character` → `entities.subject` → fallback |
| Location | `entities.setting` → `entities.subject` |
| Prop | `entities.prop` → `entities.subject` |

`assignAssetsToScene()` gebruikt entities voor recurring detection en suggested names — niet meer `extractProposalTopic(idea)` als enige bron.

---

## Cross-Scene Dedupe (Prioriteit 5)

`applySceneBeatDedupe()`:

1. Resolveert copy via i18n (of fallback zonder `t`)
2. Vergelijkt title/description/action similarity (≥ 0.82)
3. Bij duplicate → alternatieve beat variant (1 of 2)
4. Voegt warning toe op proposal: `beatTranslationWarnings[]`

Geen blokkade — alleen warning of automatische variant-switch.

---

## Director Consumption (Prioriteit 6)

Nieuwe flow in `buildDirectorProposal()`:

```
Story Architect
    ↓
extractProposalStoryEntities()
    ↓
translateStoryBeatForScene()  ← per scène
    ↓
assignAssetsToScene(entities)
    ↓
applySceneBeatDedupe()
    ↓
ProposedScene[] (beatMomentId, beatVariantIndex)
```

Director (`interpretAiDirectorPrompt`, `buildAiDirectorDirection`) blijft visuele regisseur; copy komt nu uit beat translation.

---

## Aangepaste bestanden

| Bestand | Wijziging |
|---------|-----------|
| `src/lib/studio-scene-beat-translation.ts` | **Nieuw** — consumptielaag |
| `src/lib/studio-scene-beat-translation-foundation.test.ts` | **Nieuw** — 6 tests |
| `src/lib/studio-director-proposal-builder.ts` | Beat translation wiring, entities, dedupe |
| `src/lib/studio-story-architecture.ts` | `sceneParamsFromStoryArchitecture()` + entities |
| `src/types/studio-director-proposal.ts` | `beatMomentId`, `beatVariantIndex`, `beatTranslationWarnings` |
| `src/i18n/locales/en.ts` | 45 beat translation keys + warnings |
| `src/i18n/locales/nl.ts` | 45 beat translation keys + warnings |
| `src/lib/studio-story-architecture-foundation.test.ts` | Updated assertions |
| `package.json` | Test file geregistreerd |

---

## Bewust niet gebouwd

- Geen Story Architect V2
- Geen Director V2 / Beat Planner / Narrative AI
- Geen nieuwe tabs, engines, planners
- Geen schema migraties
- Geen LLM / AI providers

---

## Validatie

| Check | Status |
|-------|--------|
| `npx prisma validate` | ✅ |
| `npx prisma generate` | ✅ |
| `npm run lint` | ✅ (0 errors, bestaande warnings) |
| `npm run build` | ✅ |
| `npm run test` | ✅ **1863/1863** |

---

## Volgende sprint (suggestie)

1. **UI:** Toon `beatTranslationWarnings` in Director proposal flow / Insights Hub
2. **Brief-integratie:** `buildStoryArchitecture({ userIdea: enrichedIdea })` voor rijkere goal derivatie
3. **Existing scenes:** Optioneel beat translation bij lege title/description op bestaande storyboards
4. **Quality metrics:** Scene uniqueness score in Creative Review / Insights Hub

---

## Gerelateerde documenten

- [Story Quality & Director Orchestration Audit](./story-quality-director-orchestration-audit.md)
- [Story Architect Foundation Report](./story-architect-foundation-report.md)
