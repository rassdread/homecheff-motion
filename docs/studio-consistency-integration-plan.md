# Studio Consistency Integration Plan

## Doel

Gebruik bestaande systemen. Integreer ze in Studio workspace als **één duidelijke tab: Consistentie / Consistency**.

Geen meerdere losse kaarten met overlappende scores in verschillende hoeken van de UI.

## User-facing onderdelen

| Onderdeel | NL | EN | Bestaande bron |
|-----------|----|----|----------------|
| Consistentiescore | Consistentiescore | Consistency score | Gemiddelde van 8 domeinen |
| Klaar om video te maken? | Klaar om video te maken? | Ready to create video? | `buildRenderReadinessSummary` |
| Verhaal | Verhaal | Story | `buildStoryHealthAdvisorReport` |
| Beeld | Beeld | Visual | `buildSceneImageReadiness` + planner consistency |
| Personages | Personages | Characters | `buildCharacterConsistencySummary` + planner warnings |
| Locaties | Locaties | Locations | visual summary + location warnings |
| Props | Props | Props | planner `prop_drops` warnings |
| Stem | Stem | Voice | `analyzeVoiceDirector` + voice identity plan |
| Audio | Audio | Audio | music/sound director readiness |
| Render | Render | Render | `buildRenderReadinessSummary` domain |

## Niet tonen aan gebruikers

- diagnostics, handoff, inspector, confidence engine, trace, metadata, provider, internal score labels

## Architectuur

```
buildStudioConsistencyOverview (NEW adapter, ~200 lines)
├── buildStudioProductionInsights (existing orchestrator)
├── buildSceneImageReadiness (existing)
├── enrichVisualProductionSummary (existing)
├── analyzeSceneImagePlanner warnings (existing)
├── analyzeVoiceDirector (existing)
├── buildMusicDirectorPlan / buildSoundDirectorPlan (existing)
└── buildVoiceIdentityPlan (existing)

StudioWorkspaceConsistencyPanel (NEW UI)
└── links to relevant tools via onSwitchTool
```

**Geen nieuwe engine.** Alleen normalisatie naar 8 domeinen + overall score.

## Tool placement

- Nieuw tool id: `consistency` in `STUDIO_TOOL_IDS` na `visual`, vóór `voice`
- Wired in: tool strip, tool panel, placeholder panel

## Relatie met bestaande UI

| Bestaande | Actie |
|-----------|-------|
| Insights rail (inspector) | **Behouden** — actieve scène tips + suggestions + improve |
| Visual tab | **Behouden** — beeldgeneratie workflow |
| Director audio confidence | **Behouden** — per-scène audio detail in Director |
| Production center | **Niet migreren** — legacy/advanced path |
| Classic consistency panels | **Niet migreren** — vision analysis blijft classic |

Consistency tab = **overzicht + navigatie**, geen vervanging van diepere tools.

## i18n

Namespace: `studio.consistency.*`, `studio.tools.consistency`, `studio.workspace.consistency.hint`

Render readiness checks hergebruiken bestaande `studio.aiAssistant.readiness.check.*` keys (al user-facing).

Story advisories hergebruiken bestaande `studio.aiAssistant.storyHealth.*` keys.

## Tests

- `studio-consistency-overview.test.ts` — level thresholds, domain count, score ordering

## P2 (bewust niet in deze sprint)

- Vision-based consistency in workspace tab
- Score threshold unification across all readiness stacks
- Retire production page / merge classic panels
- Insights rail deduplication (render readiness shown in both inspector and consistency tab — acceptable: inspector = active scene context, consistency = full overview)
- Auto-fix suggestions from consistency tab

## Validatie

```bash
npm run lint
npm run build
npm run test
```
