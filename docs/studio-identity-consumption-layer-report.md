# Identity Consumption Layer Report

## Reality Audit

### Welke identity-data bestaat

- **Identity Spec Engine** — `toIdentitySpec`, `identityCompleteness`, `collectSceneIdentitySpecs`
- **Per-kind builders** — character, location, prop, world (structured `hc:` / `[identity:*]` tokens)
- **Visual-hints modules** — location, prop, world, **character** (new)
- **Memory prompt bridge** — structured extras in continuity prompts

### Welke consumers bestaan

| Consumer | Vóór sprint | Na sprint |
|----------|-------------|-----------|
| Memory / image prompts | Partial | Unchanged (already wired) |
| AI Director proposals | Search haystack only | + shot bias, identity context, rationales |
| Visual Production | Structural checks only | + identity completeness, context lines, UI |
| Shot Planner | Heuristics only | + identity shot hints, UI rationales |
| Audio Production | Director profile only | + world audio lines, warnings |
| Continuity | Usage stats | + identity trends UI |
| Consistency | World rules summary | + full identity consumption summary |
| Unified readiness | Structural | + identity fix actions |

### Welke koppelingen ontbraken

- `collectSceneIdentitySpecs` — test-only, nu production consumer
- `resolve*IdentityShotHint` — test-only, nu shot planner + director
- `build*VisualProductionLines` — partial, nu visual production + director
- `buildWorldIdentityAudioProductionLines` — memory only, nu audio director
- `identityCompleteness` — builder UI only, nu readiness + fixes
- Character visual-hints module — ontbrak volledig

## Wat is hergebruikt

- Identity Spec Engine (geen nieuwe engine)
- Bestaande visual-hints modules + nieuwe character mirror
- `buildStudioUnifiedReadiness`, `buildDirectorProposal`, `buildAudioProductionDirectorPlan`
- `StudioAiSuggestionCard`, accordion panel patterns
- Project memory snapshot (usage stats for trends)

## Hoe AI Director identities gebruikt

- Na asset assignment: `buildSceneIdentityConsumption` per scene
- `biasShotTypeFromIdentity` past shot types aan (world > location > character > prop)
- `identityConsumption` op proposal: director context lines, rationales, completeness warnings
- UI in proposal flow: "Identity-aware proposal" sectie

## Hoe Visual Production identities gebruikt

- `buildSceneImageReadiness` — identity completeness check wanneer libraries meegegeven
- `StudioIdentityConsumptionSummary` in visual production panel
- Unified readiness fix actions voor incomplete identities

## Hoe Shot Planner identities gebruikt

- `buildShotPlannerAssetAdvice(storyboard, libraries)` — identity shot hints per scene
- Compact identity summary in shot planner panel

## Hoe Audio Production identities gebruikt

- `buildAudioProductionDirectorPlan(storyboard, options)` — world audio lines
- Info warnings + recommendations when world tone/music rules present

## Hoe Continuity identities gebruikt

- Identity trends (top world, character type, shot style, memory world)
- Compact consumption summary in continuity panel

## Hoe Project Memory identities gebruikt

- `buildIdentityMemoryTrends` — combines storyboard linked assets + memory usage stats
- No schema changes — computed at read time

## Hoe Consistency identities gebruikt

- World rules summary (existing) + full identity consumption summary
- Per-asset rule status: pass / partial / missing

## Welke bestanden zijn aangepast

**Nieuw:**
- `src/lib/studio-character-identity-visual-hints.ts`
- `src/lib/studio-identity-consumption.ts`
- `src/lib/studio-identity-consumption-foundation.test.ts`
- `src/components/studio/studio-identity-consumption-summary.tsx`
- `docs/studio-identity-consumption-layer-report.md`

**Gewijzigd:**
- `src/lib/studio-director-proposal-builder.ts`
- `src/lib/studio-visual-production-summary.ts`
- `src/lib/studio-asset-evolution.ts`
- `src/lib/studio-audio-production-director.ts`
- `src/lib/studio-unified-readiness.ts`
- `src/types/studio-director-proposal.ts`
- `src/types/studio-audio-production-director.ts`
- `src/types/studio-asset-evolution.ts`
- UI panels: visual production, shot planner, consistency, continuity, director proposal flow, tool panel
- `src/i18n/locales/en.ts`, `nl.ts`
- `package.json`

## Wat bewust niet gebouwd is

- Geen nieuwe identity engine
- Geen nieuwe builders
- Geen schema migraties
- Geen render strategy planner
- Geen timeline editor
- Geen image/audio generation wijzigingen
- Geen bulk apply / auto-overwrite van identity rules

## Wat de volgende sprint moet zijn

- Prompt path: pass source entities + `buildWorldIdentityPromptContext` in prompt body
- Consistency analyzers: derive expected phrases from visual-hints lines
- Client-side `sceneDetailToMemoryBundle` world stub fix
- Per-scene identity consumption in scene director UI
- E2E tests for identity consumption visibility

## Tests/build status

- `npx prisma validate` / `generate` — pass
- `npm run lint` — pass (0 errors)
- `npm run build` — pass
- `npm run test` — **1639/1639 pass** (+9 identity consumption tests)
