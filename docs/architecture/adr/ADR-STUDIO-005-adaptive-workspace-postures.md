# ADR-STUDIO-005 — Adaptive Workspace Postures

**Status:** Accepted (S.2)  
**Date:** 2026-08-08  
**Parent:** ADR-006  

## Decision

Studio workspace chrome is driven by `planStudioWorkspaceLayout(width, height)`:

- FULL (≥1440): both rails, unconstrained width  
- COMPACT (1024–1439): both rails, togglable  
- FOCUSED (768–1023): no permanent dual rails; list/editor + sheets  
- MOBILE (<768): single workspace; landscape uses side tool rail  

`shouldRenderPermanentStudioRobot` is always false on MOBILE; S.2 does not mount a permanent character robot on any posture (AI remains contextual / on-demand).

## Consequences

- Tool taxonomy progressive disclosure via `studio-tool-groups.ts`  
- Classic editor remains advanced-gated; not deleted  
- Architecture tests in `studio-s2-workspace.test.ts`  
