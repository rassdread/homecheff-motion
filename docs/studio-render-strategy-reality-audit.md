# Render Strategy Reality Audit

## Welke render modes bestaan al

| User-facing (Studio) | Internal (`instantMode`) | Vidu API | Goed voor |
| --- | --- | --- | --- |
| Story video | `story` | `multiframe` | Verhaalflow, campagne, montage, 2–9 frames |
| Action sequence | `transition` | `start-end2video` | Fysieke actie, before/after, opeenvolging |
| Hybrid (geadviseerd) | mix | story intro + transition actie | Intro montage + actieketen + finale hold |

**Key files:** `src/server/video-providers/vidu.ts`, `src/server/animation-jobs/service.ts`, `src/lib/instant-premium-output-plan.ts`, `src/server/instant-premium/story-mode-transitions.ts`

## Welke data beschikbaar is

- Storyboard scenes: action, emotion, camera, duration, characters, location, props
- Scene images + selected still QA scores
- Shot planner: beats, pacing, diversity score
- Identity consumption: world rules, visual lines, render strategy hints (`hc:render=`)
- Audio/music/sound plans (planning metadata)
- Render readiness / unified readiness checks
- Handoff payload v25 (nu + `renderStrategyPlan` v47 metadata)

## Welke gaps er waren

1. Geen classifier die story vs action_chain vs hybrid adviseert
2. World `renderStrategies` metadata niet gekoppeld aan advies
3. Geen actiecomplexiteit / shot-split advies in UI
4. Geen image requirement matrix per aanpak
5. Speed advice niet user-facing (geen FFmpeg speed pipeline)
6. Handoff droeg geen render strategy metadata
7. Motion negeert plan nog (P1) — fallback blijft wizard mode toggle

## Deze sprint

`buildStudioRenderStrategyPlan()` sluit gaten 1–4 en 6. Gap 5 = advice-only. Gap 7 = P1 Motion consumer.
