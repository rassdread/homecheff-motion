# ADR-STUDIO-004 — Editor / Studio Code Splitting

**Status:** Accepted (S.1)  
**Date:** 2026-08-08

## Context

S.0 found almost no `next/dynamic` usage. Largest clients (`editor-canvas-workspace` ~3.3k LOC, `studio-workspace-shell`) inflated initial product bundles.

## Decision

Introduce deliberate dynamic imports for heavy, non-critical-on-first-paint surfaces:

1. `StudioWorkspaceShell` — load when `storyboardId` present  
2. `EditorCanvasWorkspace` — load when editor session opens  

Do **not** lazy-load primary navigation/header.

## Consequences

- Smaller initial `/studio` and `/editor` start payloads  
- Slight delay on first open of workspace/canvas (acceptable)  
- Further tool-level splits deferred to S.2/S.3
