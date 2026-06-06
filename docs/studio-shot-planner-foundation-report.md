# Shot Planner Foundation Report

## Welke bestaande systemen zijn hergebruikt

- **`buildAutoShotPlan`** — primaire shot-aanbevelingen per arc-fase
- **`buildAiDirectorDirection`** — AI-voorstel met strength + quality scores
- **`planFromCurrentScenes`** — huidig plan voor compare
- **`analyzeStoryFlow`** — streak / variety warnings
- **`storyboardToFlowInput`** — canonieke storyboard → flow mapper
- **`buildStudioUnifiedReadiness`** — render soft warnings uitgebreid met shot readiness
- **`buildStudioConsistencyOverview`** — story domain krijgt shot advies
- **Scene PATCH API** — apply proposal (geen auto-save)

## Welke dubbele systemen zijn verwijderd of samengebracht

- **`studio-shot-planner.ts`** centraliseert auto plan + AI direction + beats + flow + consistency
- **`studio-scene-suggestions.ts`** importeert `buildAutoShotPlan` via shot planner (niet direct auto-shot file)
- Workspace AI Director compare deelt logica met classic panel maar toont **beat-niveau** (opening/focus/detail/closing)

Niet samengevoegd (bewust):

- Director V2 `PURPOSE_PATCHES` — handmatige story purpose blijft naast AI suggest
- Classic `studio-ai-director-panel.tsx` — blijft in storyboard editor

## Hoe shot planning werkt

1. Per scène: arc-fase (`buildStoryArc` / `detectArcPhaseForIndex`)
2. Focus shot: opgeslagen `shotType` + `cameraMovement` + `sceneEnergy`, of auto plan
3. Beats: **opening** (wider), **focus** (scene action/title), optioneel **detail**, **closing** (emotion/result)
4. Storyboard plan: camera flow, motion progression, pacing uit `durationSeconds`
5. Apply: gebruiker klikt **Gebruik voorstel** → storyboard + scene PATCH

Geen DB-migratie; geen aparte shot-tabel.

## Hoe AI Director het gebruikt

- **`StudioWorkspaceShotPlannerPanel`** (Visual-tab): prompt + strength → `buildProposedStoryboardShotPlan`
- Compare modal: huidig vs AI per scène met beats
- Apply: zelfde flow als classic AI Director panel

## Hoe Visual Production het gebruikt

- **`StudioWorkspaceVisualProductionPanel`**: sectie Shot & camera flow
  - Camera flow (shot types per scène)
  - Shot variety score
  - Scene pacing totaal
  - Motion flow (camera movements)

## Hoe Consistency het gebruikt

- **`analyzeShotPlanConsistency`**: advice-only (te veel close-ups/wides, streaks, missing flow)
- Consistency overview story domain: top 2 shot adviezen
- Geen blokkades op render

## Continuity & Project Memory

- **`StudioProjectMemorySnapshot.shotPatterns`**: aggregatie shotType + cameraMovement over storyboards
- Continuity-tab sectie **Shot patterns**

## Render Readiness

- **`resolveStoryboardShotPlanReadiness`**: shot flow, pacing, motion logical
- Soft warnings in **`buildStudioUnifiedReadiness`** via bestaande render warning lijst

## Welke bestanden zijn aangepast

**Nieuw:**

- `src/types/studio-shot-planner.ts`
- `src/lib/studio-shot-planner.ts`
- `src/lib/studio-shot-planner-foundation.test.ts`
- `src/components/studio/studio-workspace-shot-planner-panel.tsx`
- `src/components/studio/studio-shot-planner-compare-modal.tsx`
- `docs/studio-shot-planner-reality-audit.md`
- `docs/studio-shot-planner-foundation-report.md`

**Gewijzigd:**

- `src/components/studio/studio-workspace-tool-panel.tsx`
- `src/components/studio/studio-workspace-visual-production-panel.tsx`
- `src/components/studio/studio-workspace-continuity-panel.tsx`
- `src/lib/studio-consistency-overview.ts`
- `src/lib/studio-unified-readiness.ts`
- `src/lib/studio-project-continuity-score.ts`
- `src/lib/studio-scene-suggestions.ts`
- `src/types/studio-project-memory.ts`
- `src/lib/studio-project-memory-utils.ts`
- `src/server/studio/studio-project-memory-service.ts`
- `src/i18n/locales/en.ts`, `nl.ts`
- `package.json` (test script)

## Wat bewust niet gebouwd is

- Timeline editor
- Video editor
- Nieuwe render engine
- Nieuwe AI provider
- Per-beat DB persistence (P2)
- Sidechain / multi-shot image generation per beat

## Wat P2 blijft

- Persistente beat-level metadata (JSON per scène)
- Director V2 purpose patches unificeren met arc phases
- Story health → automatische plan correctie
- Dedicated transition planner
- `storyboardToFlowInput` dedupe in alle panels

## Tests/build status

- **Lint:** 0 errors (149 warnings baseline)
- **Build:** success
- **Tests:** **1580/1580** pass (includes 7 shot planner foundation tests)
