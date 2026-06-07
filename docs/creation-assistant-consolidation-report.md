# Creation Assistant Consolidation Report

## Samenvatting

Studio heeft nu één project-level **Creation Assistant** tab die bestaande intelligentie consolideert zonder nieuwe engines. Gebruikers zien geprioriteerde acties (“Wat moet ik nu doen?”) boven Creative Review (analyse).

## Hergebruikte systemen

| Systeem | Rol in consolidatie |
|---------|---------------------|
| `buildCreativeReview()` | Story, asset, audio, render review items |
| `buildStudioProductionPlan()` | creationGuidance, domainReadiness |
| `buildStudioUnifiedReadiness()` | fixes, score, level |
| `buildSceneGenerationPlan()` | required/recommended image tasks |
| `buildReadinessFixActions()` | fix tasks met suggestedAsset + tool |
| `onSwitchTool` | navigatie naar Story, Characters, Visual, Voice, Render, etc. |
| `StudioAiSuggestionCard` | fix-taken met use suggestion + open |

## Task aggregation

`buildCreationAssistantView()` projecteert:

- **Input:** zelfde als Creative Review (`StudioCreationAssistantInput`)
- **Output:** `nowTasks`, `nextTasks`, `optionalTasks`, `completedItems`, `blockers`, `completionProgress`

Dedupe-sleutel: `category:messageKey:toolId:sceneOrder`. Limieten: now 10, next 10, optional 8, blockers 8, completed 12.

## Prioritering

Bestaande readiness — geen nieuwe score:

1. Readiness fixes + creationGuidance → **now**
2. Required missing images + high missingElements → **now**
3. Weaknesses + recommended images + partial assets → **next**
4. improvementSuggestions + opportunities → **optional**
5. Passed checks + domainReadiness + strengths → **completed**

## Completion tracking

`completionProgress` combineert:

- `domainReadiness` passed count (5 domains)
- Unified readiness level/score
- Project status: started → building → almost_ready → ready_for_render

Geen persistente opslag — afgeleid uit live storyboard state.

## Domein-taken

| Domein | Bron | UI-actie |
|--------|------|----------|
| Asset | creationGuidance, asset review | Open library / Create new / Open |
| Image | generationPlan required/recommended | Open Visual |
| Audio | Creative Review audio items | Open Voice / Music / Sound |
| Story | story phases + advisories | Open Story |
| Render | render review items | Open Render / Visual (images incomplete) |
| Fix | unified.fixes | Open / Use suggestion |

## AI Director

- `buildCreationAssistantContext()` → `creationAssistantContext` op proposal
- `enrichIdeaWithCreationAssistant()` na Creative Review enrichment
- Director ziet open task keys + assistant context lines

## Bestanden

| Bestand | Wijziging |
|---------|-----------|
| `src/types/studio-creation-assistant.ts` | Types |
| `src/lib/studio-creation-assistant.ts` | `buildCreationAssistantView()`, context, enrich |
| `src/lib/studio-creation-assistant-foundation.test.ts` | 12 tests |
| `src/components/studio/studio-workspace-creation-assistant-panel.tsx` | UI tab |
| `src/lib/studio-tool-id.ts` | `creationAssistant` tool |
| `src/components/studio/studio-tool-strip.tsx` | Tab label |
| `src/components/studio/studio-workspace-tool-panel.tsx` | Panel wiring |
| `src/components/studio/studio-tool-placeholder-panel.tsx` | Title key |
| `src/lib/studio-director-proposal-builder.ts` | Director integration |
| `src/types/studio-director-proposal.ts` | `creationAssistantContext` |
| `src/i18n/locales/en.ts` | EN strings |
| `src/i18n/locales/nl.ts` | NL strings (Creatieassistent) |
| `docs/creation-assistant-consolidation-audit.md` | Audit |

## Bewust niet gebouwd

- Nieuwe AI, planners, review of readiness engines
- Schema migraties
- Render start
- Persistent task dismiss/acknowledge
- Director modal jump-to-tool
- Duplicatie van Creative Review UI

## Volgende sprint

1. **Director modal bridges** — `onSwitchTool` vanuit proposal suggestions
2. **Dismiss/acknowledge** — client-only `hc-creation-assistant-dismissed-{storyboardId}`
3. **Brief-to-workspace continuity** — surface brief decisions in assistant
4. **User features** — voice preview, music preview, asset upload extraction, world inheritance

## Validatie

Run na merge: `npx prisma validate`, `npx prisma generate`, `npm run lint`, `npm run build`, `npm run test`.
