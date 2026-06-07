# Snapshot & Versioning Reality Audit

**Date:** 2026-06-06  
**Scope:** Read-only audit before Snapshots, Versioning & Recovery sprint.

---

## Geschiedenis die al bestaat

| Systeem | Wat het bewaart |
|---------|-----------------|
| PostgreSQL | Storyboard, scenes, assets, scene images |
| Asset decisions (localStorage) | Workflow beslissingen per storyboard |
| Production Timeline | Afgeleide events (niet persistent) |
| Motion render versions | Video outputs, prompt snapshots |
| Character voice history | Voice profile wijzigingen |
| Motion handoff JSON | Studio→Motion import snapshot |

---

## Versies die al bestaan

- **Video/render versies** — Motion `ProjectRenderVersion`, Versions tab
- **Scene image generations** — meerdere `StudioSceneImage` rijen per scene
- **Geen storyboard-level configuratie versies** vóór deze sprint

---

## Wijzigingen die verloren gaan

| Wijziging | Risico |
|-----------|--------|
| Storyboard/scene edits | Geen undo — vorige waarden weg |
| Asset decisions bij localStorage clear | Beslissingen kwijt |
| Director proposal vóór apply | Ephemeral |
| Production Brief na story create | Alleen subset naar storyboard |
| Creation Assistant task state | Altijd derived — geen history |

---

## Herbruikbare systemen

| Systeem | Hergebruik |
|---------|------------|
| `studio-asset-decision-storage.ts` | localStorage pattern + registry in snapshot |
| `buildProductionTimeline()` | Snapshot created/restored events |
| `buildStudioProductionPlan()` | Planner summary in snapshot |
| `buildStoryboardIdentityConsumption()` | Identity summaries |
| `buildCreationAssistantView()` | Assistant summary + recovery point |
| `updateStudioStoryboardApi` / `updateStudioSceneApi` | Manual restore |

---

## Snapshot-waardige data

1. Storyboard config (title, idea, style, voice/music/sound)
2. Scene config (text, duration, shot settings, asset links) — **geen images**
3. Asset decision registry
4. Production brief (optional)
5. Identity completeness summaries
6. Planner summary (scenes, shots, duration, render strategy)
7. Creation assistant progress snapshot

**Niet snapshotten:** renders, blobs, media, derived memory/pattern profiles.

---

## Central hook

`buildStudioSnapshot()` + `hc-studio-snapshot-history-{storyboardId}` localStorage.
