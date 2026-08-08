# Studio S.2 — Workspace & IA Certification (in progress)

**Branch:** `refactor/studio-s2-adaptive-workspace`  
**Base:** `9243d722` (S.1 production cert on main)

## Implemented

- Ecosystem Adaptive Workspace canon + ADR-006
- Studio IA + workspace docs + ADR-STUDIO-005
- Posture engine + robot policy gates
- Progressive tool taxonomy
- Adaptive `StudioWorkspaceShell` (rails toggle, ultrawide unconstrained, mobile landscape side tool rail, on-demand AI)
- Project context eyebrow in header
- Architecture tests

## Classic editor

KEEP — advanced-gated legacy; not deleted.

## Remaining for full S.2 DoD

- Preview deployment GREEN across all viewports
- Production smoke after merge
- Broader empty/loading/error polish pass (partial via existing surfaces)
- Keyboard shortcut audit (documented target only unless foundations exist)

## Robot gate

`data-studio-permanent-robot="false"` on adaptive shell; mobile on-demand AI via `studio-ai-ondemand`.
