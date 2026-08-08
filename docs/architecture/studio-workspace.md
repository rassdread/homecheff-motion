# Studio Workspace Architecture (S.2)

**Status:** CANONICAL  
**Inherits:** `homecheff-adaptive-workspace-system.md`  
**Implementation:** `StudioWorkspaceShell` + posture helpers  

---

## Current ownership (audit → target)

```
┌─ AppShell (GLOBAL suite) ────────────────────────────────────┐
│ Studio Header — project title / Make video / Home (PRIMARY)  │
├──────────────┬───────────────────────────────┬───────────────┤
│ Left Rail    │ Main Creative Workspace       │ Right Rail    │
│ Scenes       │ Director / tool surfaces      │ Inspector     │
│ (PRIMARY)    │ (PRIMARY — largest area)      │ AI context    │
└──────────────┴───────────────────────────────┴───────────────┘
│ Tool strip (PRIMARY) — progressive disclosure                │
└──────────────────────────────────────────────────────────────┘
```

### Classification

| Surface | Class |
|---------|-------|
| Three-pane + tool strip | PRIMARY |
| Scene sidebar | PRIMARY |
| Director V2 / tool panels | PRIMARY |
| V9 inspector / insights | CONTEXTUAL |
| Mobile AI sheet / on-demand button | CONTEXTUAL |
| AppShell + Growth copilot | GLOBAL |
| Classic editor | LEGACY (advanced) |
| Permanent robot chrome | **Forbidden on mobile**; not mounted as permanent character UI |

---

## Posture behavior

| Posture | Left | Center | Right | Tools | Robot |
|---------|------|--------|-------|-------|-------|
| FULL | Inline | Flex (unconstrained width) | Inline | Bottom strip | No permanent character |
| COMPACT | Toggle | Flex | Toggle | Bottom strip | No permanent character |
| FOCUSED | Overlay/list | Priority | Sheet | Bottom strip | On-demand AI only |
| MOBILE portrait | List pane | Priority | Sheet | Bottom strip | **Hidden permanently** |
| MOBILE landscape | Hidden | Maximize | Sheet | **Side tool rail** | **Hidden permanently** |

Helpers: `src/lib/studio-workspace-posture.ts`, `useStudioWorkspaceLayoutPlan`.

Certification hooks: `data-studio-posture`, `data-studio-permanent-robot="false"`, `data-testid="studio-ai-ondemand"`.

---

## AI / robot policy

- Desktop AI: right inspector / insights (contextual), Growth copilot remains GLOBAL suite chrome  
- Tablet: on-demand sheet  
- Mobile portrait & landscape: **no permanent robot/mascot**; AI via toolbar / sheet (`studio-ai-ondemand`)  
- Creative workspace always has priority  

---

## Timeline

No NLE timeline in the live workspace. Scene list acts as navigator. Classic `StudioStoryboardTimeline` stays classic-only. Mobile must not permanently eliminate canvas for a timeline.

---

## State preservation

`activeTool`, `activeSceneId`, and storyboard client state remain in `StudioWorkspaceShell`. Tool switches must not reload the storyboard.
