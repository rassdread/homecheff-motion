# Story Architect Foundation Report

**Date:** 2026-06-06  
**Scope:** Narrative layer before scenes — no new AI, no Animation/Render changes.

---

## Samenvatting

Studio bouwt nu eerst een **verhaalarchitectuur** via `buildStoryArchitecture()` voordat AI Director scènes voorstelt. Scènetekst volgt **narratieve momenten** in plaats van de ruwe prompt te herhalen.

---

## Hergebruikte systemen

| Systeem | Rol |
|---------|-----|
| `buildStudioProductionPlan()` | storyStructure + status |
| `detectArcPhaseForIndex()` | Phase → moment mapping |
| Production Brief / Memory | goal, theme, message |
| AI Director proposal builder | Scene consumption |
| Creative Review / Creation Assistant | Gap detection |
| Production Plan panel | Architect summary |

---

## Hoe Story Architect werkt

**Builder:** `src/lib/studio-story-architecture.ts`

**Input:** user idea, brief, storyboard, memory, director context  
**Output:** storyGoal, theme, message, storyStructure, storyMoments, narrativeFlow, directorContextLines

---

## Verhaalstructuur

5 fases: intro, setup, development, climax, ending  
Status: present / weak / missing / strong (geen blokkades)

---

## Story moments

Vertrek → Ontdekking → Conflict → Doorbraak → Afsluiting  
Elk moment heeft beat + scene template keys vóór scènes.

---

## AI Director verbetering

- `storyArchitectureContext` on proposal
- Scenes use `studio.storyArchitect.scene.{moment}.*` keys
- `sceneParamsFromStoryArchitecture()` — unique params per scene (storyGoal, message, scene index)

---

## Production Planner verbetering

Story Architect Summary sectie + link naar Verhaalarchitectuur tab.

---

## Creation Assistant verbetering

Tasks from `recommendationKeys`: missing climax, missing ending, unclear message.

---

## Creative Review verbetering

Director context lines prefixed with `architect:` from story architecture.

---

## Aangepaste bestanden

| Bestand | Wijziging |
|---------|-----------|
| `src/types/studio-story-architecture.ts` | **Nieuw** |
| `src/lib/studio-story-architecture.ts` | **Nieuw** — `buildStoryArchitecture()` |
| `src/lib/studio-director-proposal-builder.ts` | Architecture-driven scenes |
| `src/lib/studio-creation-assistant.ts` | Architect gap tasks |
| `src/lib/studio-creative-review.ts` | Architect context |
| `src/components/studio/studio-workspace-story-architecture-panel.tsx` | **Nieuw** UI |
| `src/components/studio/studio-workspace-production-plan-panel.tsx` | Summary |
| `src/lib/studio-tool-id.ts` | `storyArchitecture` tool |
| `src/i18n/locales/en.ts` / `nl.ts` | Full parity |
| `src/lib/studio-story-architecture-foundation.test.ts` | **Nieuw** — 11 tests |

---

## Bewust niet gebouwd

- New AI providers / LLM story generation
- Image generation changes
- Animation Planner changes
- Render Strategy changes
- Schema migrations

---

## Volgende sprint

1. Per-scene beat editor in Story Architecture UI
2. Brief → architecture pre-fill on story create
3. Architecture-aware scene apply diff preview
4. Stronger message detection from Creative Review

---

## Validatie

| Check | Status |
|-------|--------|
| `npx prisma validate` | ✅ |
| `npx prisma generate` | ✅ |
| `npm run lint` | ✅ (pre-existing warnings elsewhere) |
| `npm run build` | ✅ |
| `npm run test` | ✅ **1828/1828** (+11 story architect tests) |
