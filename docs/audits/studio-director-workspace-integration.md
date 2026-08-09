# Studio Creative Director — Workspace Integration (S.6F)

**Date:** 2026-08-09  
**Constraint:** Canonical shell remains `StudioWorkspaceShell` at `/studio?storyboardId=` (NN-09).  
**Forbidden:** Separate Creative Director application.

---

## 1. Current shell facts

| Element | Behavior |
|---------|----------|
| Postures | FULL / COMPACT / FOCUSED / MOBILE (ADR-006) |
| Layout | Left scenes · center creative · right inspector |
| Tools | Bottom rail (desktop) / side rail (mobile landscape) |
| Story tool | Hosts Director V2 + proposals when `activeTool === "story"` |
| Other tools | Voice, music, creationAssistant, directorPreferences, production, … |
| AI | On-demand sheet — not permanent robot on mobile |
| Continuity libraries | Loaded once into shell context |

---

## 2. Where Creative Director fits

| Mode | Integration point |
|------|-------------------|
| **Quick** | Entry via `/studio/start`, intents, Instant/Motion, Creation Assistant → land in shell with defaults applied; inspector collapsed |
| **Professional** | Existing tool rails + right inspector; Director V2 sections for explicit control |
| **Director** | Center story tool: proposals, compare, Movie Builder / Production Center links; inspector shows rationale |

Creative Director is a **policy + orchestration layer** behind:

1. `StudioDirectorPanelV2` (primary advanced UI)  
2. Creation Assistant / assistant registry (doors)  
3. `directorPreferences` tool  
4. Proposal apply pipeline  

Not a new top-level IA node competing with Storyboards/Assets.

---

## 3. Viewport rules (design)

| Viewport | Director chrome |
|----------|-----------------|
| Desktop / ultrawide FULL | Full Director V2 + inspector rationale |
| Tablet COMPACT | Director sections progressive; proposals in center |
| Mobile portrait FOCUSED/MOBILE | Quick defaults first; Director controls on-demand; no permanent AI robot |
| Mobile landscape | Side tool rail; Director tools available without losing scene context |

Tool switches must **not** reload storyboard or drop Continuity context (S.2 law).

---

## 4. What must stay outside Director UI ownership

- Entity CRUD (Characters/Locations/Props/Worlds)  
- ContinuityBundle resolution  
- Prompt Matrix assembly / debug  
- Provider credentials / credit meters  
- GenerationJob billing  

Inspector may **show** continuity module presence (S.6E debug-style, safe) but not expose private prompts by default.

---

## 5. Integration anti-patterns

| Anti-pattern | Why forbidden |
|--------------|---------------|
| `/creative-director` separate product | Breaks NN-09 shell |
| Quick mode without Continuity when entities linked | Breaks S.6C |
| Director auto-calling providers | Breaks Transform/Job ownership |
| Replacing Director V2 with greenfield UI in S.6F.1 | Unnecessary risk; orchestrate first |
