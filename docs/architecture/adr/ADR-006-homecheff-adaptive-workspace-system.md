# ADR-006 — HomeCheff Adaptive Workspace System

**Status:** Accepted (S.2)  
**Date:** 2026-08-08  
**Products:** HomeCheff · Growth · Studio  

## Context

Three principal products risk diverging into incompatible shells (desktop-only three-pane, mobile as shrunk desktop, permanent assistant chrome). Users need one recognizable workspace philosophy without forcing identical visuals.

## Decision

Adopt a shared **Adaptive Workspace System**:

1. Space-first postures: FULL · COMPACT · FOCUSED · MOBILE  
2. Left / center / right ownership with center priority  
3. Rails collapse; mobile is single-primary  
4. Landscape maximizes creative width/height intentionally  
5. Contextual AI; permanent robot/mascot forbidden on mobile portrait and landscape  
6. Each product keeps its own visual identity  

Studio implements postures in `studio-workspace-posture.ts` and shell chrome in `StudioWorkspaceShell`.

## Consequences

- Ecosystem docs live in `homecheff-adaptive-workspace-system.md`  
- Studio IA/workspace docs must reference this ADR  
- Future HomeCheff / Growth shell work should align postures, not copy Studio pixels  
