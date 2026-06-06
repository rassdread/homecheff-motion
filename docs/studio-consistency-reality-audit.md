# Studio Consistency Reality Audit

## Welke systemen al bestaan

Studio heeft **meerdere lagen** van readiness/quality/consistency — geen enkele monolithische engine, maar wel een rijk ecosysteem van lib-helpers en UI-panelen.

### Workspace V2 (default route)

| Systeem | Lib | UI |
|---------|-----|-----|
| Production insights orchestrator | `buildStudioProductionInsights` | `StudioProductionInsightsRail` |
| Story health advisor | `buildStoryHealthAdvisorReport` | Insights rail (Story Health) |
| Render readiness (5 checks) | `buildRenderReadinessSummary` | Insights rail (Readiness) |
| Character metadata consistency | `buildCharacterConsistencySummary` | Insights rail (Consistency) |
| Motion quality prediction | `predictMotionQuality` | Insights rail (Quality) |
| Visual production readiness | `buildSceneImageReadiness` | `StudioWorkspaceVisualProductionPanel` |
| Scene image planner | `analyzeSceneImagePlanner` | Visual panel + classic scene image |
| Audio confidence | `buildStudioAudioConfidence` | `StudioAudioConfidenceCard` (Director V2) |
| Director proposal readiness | `buildProposalRenderReadiness` | `StudioDirectorProposalFlow` |
| Scene handoff badges | `studio-scene-handoff-badges` | `StudioWorkspaceInspectorPanel` |

**Orchestrator:** `buildStudioProductionInsights` roept in één pass story health, render readiness, character consistency summary en motion quality aan — voorkomt dubbele `analyzeStoryIntelligence`-calls.

**Inspector:** `StudioWorkspaceInspectorPanel` + `StudioMobileInsightsSheet` tonen de insights rail (desktop rechts, mobile bottom sheet). Gate: `NEXT_PUBLIC_STUDIO_AI_ASSISTANT≠false`.

### Classic / Movie Builder / Production page

| Systeem | Lib | UI |
|---------|-----|-----|
| Production readiness (16 asset lanes) | `buildAssetReadiness`, `computeReadinessScore` | `StudioProductionCenter` |
| Production score composite | `buildProductionScoreReport` | Production center, movie builder |
| Story intelligence panel | `analyzeStoryIntelligence` | `StudioStoryIntelligencePanel` |
| Movie director quality | `buildDirectorQualityReport` | `StudioMovieDirectorQuality` |
| Movie readiness score | `computeMovieReadinessScore` | Movie builder steps |
| Scene image health | `scoreSceneImageHealth` | `StudioSceneImagePanel` |
| Prompt quality | `scorePromptQuality` | Indirect via image health |
| Voice director score | `analyzeVoiceDirector` | Production center voice lane |

### Vision-based consistency (post-image)

| Systeem | Lib | UI |
|---------|-----|-----|
| Character consistency engine | `buildStoryboardCharacterConsistencyReport` | `StudioCharacterConsistencyPanel` (classic) |
| Scene consistency | `buildSceneConsistencyReport` | `StudioSceneConsistencyPanel` |
| Combined image score | `computeCombinedImageScore` | Image selection / improve flow |
| Improvement summary | `buildStoryboardImprovementSummary` | Movie builder analyze/improve |

### Motion (post-handoff)

| Systeem | Lib | UI |
|---------|-----|-----|
| Motion studio intelligence | `buildMotionStudioIntelligenceSnapshot` | `MotionStudioIntelligencePanel` |
| Motion render readiness | `computeMotionRenderReadiness` | Motion QA modal, project QA |
| First render confidence | — | `MotionFirstRenderConfidencePanel` |
| Intelligence staleness | `detectStudioIntelligenceStaleness` | `MotionProjectStudioQaPanel` |
| Handoff payload | `create-motion-handoff-payload` | Workspace → Motion import |

### Project / Version diagnostics (niet Studio workspace)

| Component | Doel |
|-----------|------|
| `ProjectRenderTracePanel` | Render pipeline trace |
| `VersionCenterLineagePanel` | Version lineage tree |
| `VersionIntelligencePanel` | Version change intelligence |

---

## Welke scores/checks al bestaan

| Score/check | Bron | Bereik |
|-------------|------|--------|
| storyHealthScore | `computeStoryHealthScore` | 0–100 |
| Render readiness | 5 checks (scenes, images, voice, text beats, emotion) | 0–100 |
| Visual image readiness | 6 checks (characters, location, world, camera, emotion, images) | 0–100 |
| Character metadata consistency | voice lock, personality, reference, performance | 0–100 per character |
| Motion quality prediction | heuristic pre-render | 0–100 |
| Production readiness | 16 asset lanes ready/attention/not_ready | composite score |
| Director quality | shot diversity, story health, style | 0–100 |
| Voice director score | script, timing, settings | 0–100 |
| Visual consistency (planner) | continuity warnings penalty | 0–100 |
| Vision consistency (images) | per-image consistencyScore | 0–100 |
| Movie readiness | weighted multi-factor | tier + score |
| Motion render readiness | post-handoff vision/consistency/drift | tier |

---

## Welke componenten ze tonen

- **Insights rail:** 3 score rings (story, readiness, quality) + secties story health, readiness checklist, character consistency list, motion quality reasons, scene suggestions, improve preview
- **Visual tab:** production overview, image readiness, visual concept, prompt, bulk generate, `StudioSceneImagePanel`
- **Director V2:** `StudioAudioConfidenceCard` (voice/music/sound summary)
- **Classic production center:** 16-asset grid, warnings, composite production score
- **Classic character consistency panel:** vision-based identity timeline
- **Motion QA panels:** intelligence snapshot, stale badge, first render checklist

---

## Welke data ze gebruiken

- **Scene metadata:** shotType, camera, emotion, characters, location, props, description
- **Storyboard flags:** voiceEnabled, musicEnabled, soundEnabled, profiles
- **Scene images:** status, visionReport, consistencyReport, selectedSceneImageId
- **Character library:** voiceLock, voiceProfile, personality, referenceImageUrl, performance fields
- **Director plans:** music/sound/voice/audio production/asset plans
- **Handoff payload:** bundled intelligence for Motion

Geen nieuwe datamodellen nodig — alles leest bestaande storyboard/scene/character/image data.

---

## Welke onderdelen overlappen

1. **Drie readiness checklists** voor hetzelfde storyboard:
   - `buildRenderReadinessSummary` (5 checks, insights rail)
   - `buildSceneImageReadiness` (6 checks, visual tab)
   - `buildProposalRenderReadiness` (7 checks, AI director)
   - `buildAssetReadiness` (16 lanes, production center)

2. **Twee “character consistency” modellen:**
   - Metadata advisory (`buildCharacterConsistencySummary`) — cast field completeness
   - Vision identity (`buildStoryboardCharacterConsistencyReport`) — image analysis

3. **Twee motion readiness modellen:**
   - Studio-side `predictMotionQuality` (pre-handoff heuristic)
   - Motion-side `computeMotionRenderReadiness` (post-handoff vision)

4. **Story health dubbel op classic path:**
   - `StudioStoryIntelligencePanel` + production center both run intelligence

5. **Image readiness criteria verschillen:**
   - Insights: any completed image
   - Movie handoff: selected + completed + URL

---

## Welke termen developer-facing zijn

| Term | Waar | User-facing alternatief |
|------|------|-------------------------|
| diagnostics | render trace, draft diagnostics | niet tonen in Studio |
| handoff | badges, payload, API | niet tonen (intern) |
| inspector | workspace inspector panel | “Tips” / insights rail |
| confidence engine | audio confidence lib name | “Audio-overzicht” |
| trace | ProjectRenderTracePanel | alleen video detail |
| metadata | character consistency summary | “Personageprofiel” |
| provider | execution plan, image provider | nooit in workspace UI |
| readiness (raw) | asset readiness lanes | “Klaar om…” |
| QA | motion QA panel | “Controle” |

Bestaande workspace copy gebruikt al `studio.productionInsights.*` en `studio.aiAssistant.*` — deels nog “AI Assistant” framing.

---

## Welke systemen dood/onbereikbaar zijn

| Item | Status |
|------|--------|
| `StudioAiProductionAssistantPanel` | **Dead** — deprecated alias, zero imports |
| `StudioWorkspaceInsights` | **Bestaat niet** |
| `studio-readiness.ts` / `studio-quality.ts` | **Bestaan niet** als bestanden |
| Production page `/production` | **Reachable maar redundant** (docs) |
| Classic-only panels | Reachable via `/classic`, niet dead |
| Insights rail | Hidden when `NEXT_PUBLIC_STUDIO_AI_ASSISTANT=false` |

---

## Welke systemen al in Studio workspace zitten

- Production insights rail (inspector + mobile sheet)
- Visual production tab
- Audio confidence card (Director tab)
- Director proposal readiness
- Scene handoff badges (inspector)
- Scene suggestions + improve preview

---

## Welke systemen nog alleen in classic/advanced/motion zitten

| Systeem | Route |
|---------|-------|
| Production center (16 lanes) | `/classic`, `/production`, movie-builder |
| Story intelligence panel | `/classic` |
| Character consistency panel (vision) | `/classic` |
| Movie readiness score | movie-builder |
| Motion intelligence + render readiness | Motion wizard, `/videos/[id]` |
| First render confidence | Motion wizard |
| Render trace | `/videos/[id]` |
| Version lineage/intelligence | Version center |

---

## Wat ontbreekt echt

- **Eén unified user-facing consistency view** in workspace (was verspreid over insights rail + visual tab + director cards)
- **Locatie/props/wereld als aparte user-facing domeinen** (logica zat in image planner warnings, niet als eigen kaarten)
- **Vision-based consistency in workspace** (alleen classic + motion post-handoff)
- **Score normalisatie** tussen de 3–4 readiness stacks (verschillende thresholds)
- **E2E smoke** voor consistency tab

**Conclusie audit:** Genoeg bestaat om te integreren zonder nieuwe engine. Alleen een dunne adapter + één tab nodig.
