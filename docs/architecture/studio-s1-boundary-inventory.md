# S.1 Client / Server Boundary Inventory

**Phase:** S.1  
**Date:** 2026-08-08

## Classification legend

- **CLIENT_SAFE** — safe in browser bundles  
- **SHARED_PURE** — no Node/secrets/DB  
- **SERVER_ONLY** — must not reach client graphs  
- **BOUNDARY_VIOLATION** — was leaking; fixed or tracked  

## P0 violations addressed

| Path | Before | After |
|------|--------|-------|
| `src/lib/editor-fusion-workflow-credits.ts` → `@/server/.../studio-action-cost-registry` | BOUNDARY_VIOLATION (`USD_PER_CREDIT`) | SHARED_PURE via `studio-credit-constants.ts` |
| Dual fusion credit maps | BOUNDARY_VIOLATION / drift risk | Intent map SSOT in `studio-credit-constants`; registry default aligned via `FUSION_RENDER_ACTION_DEFAULT_CREDITS` |
| `src/lib/studio-audio-mix-resolve.ts` → `studio-user-audio-library-blob` (`node:crypto`) | BOUNDARY_VIOLATION | Imports `studio-user-audio-library-find` (SHARED_PURE) |
| `src/lib/attach-audio-mix-handoff.ts` → blob list I/O | BOUNDARY_VIOLATION in `lib/` | Moved to `src/server/studio/attach-audio-mix-handoff.ts` + `server-only` |
| `studio-user-audio-library-blob.ts` | SERVER_ONLY unmarked | Documented SERVER_ONLY + architecture denylist (tsx tests cannot use `import "server-only"` without a shim) |

## Known remaining lib→server imports (tracked, not all S.1)

These are **not** all client-reachable, but violate the “lib as dump” rule. Flag for later packaging:

| Module | Server import | Class |
|--------|---------------|-------|
| `studio-billing-sync.ts` | action registry, plan config, pricing rules | SERVER-leaning helper (keep out of `"use client"`) |
| `assistant-billing-awareness.ts` | wallet + pricing services | SERVER_ONLY usage expected |
| `studio-voice-ffmpeg.ts` | animation-export overlay | SERVER_ONLY |
| `studio-transcript-from-audio.ts` | STT + metering | SERVER_ONLY |
| `vision/unified-detection-client.ts` | ONNX object detector | Edge case (name says client) — S.2+ |
| `instant-premium-pricing.ts` | billing video pricing | Shared display risk |
| `vercel-blob-config.ts` | `node:crypto` in `lib/` | SERVER_ONLY in practice |

## Audio mix boundary (target)

| Layer | Responsibility |
|-------|----------------|
| Client | UI state, select/upload intent, call APIs, pure mix plan preview from in-memory library list |
| Shared | Types + `findUserAudioLibraryAsset` + timeline math |
| Server | Blob manifest I/O, upload, hashing ids, handoff attach |

## Credit matrix (fusion) — financial behavior unchanged

| Action / intent | UI projection | Backend validation | Deduction | Value | Mismatch? |
|-----------------|---------------|--------------------|-----------|-------|-----------|
| `fusion_render` registry default | N/A (fallback) | `STUDIO_ACTION_COST_REGISTRY.fusion_render` | Used only without override | **25** | No — documented fallback |
| `character_fusion` | `fusionWorkflowRenderCredits` | `resolveFusionRenderCreditsRequired` + `overrideCredits` | override | **25** | No |
| `future_child` / `genetic_blend` | same | same | override | **35** | No |
| `life_timeline` | same | same | override | **50** | No |
| `character_upgrade` / role / outfit / … | same | same | override | **15** | No |
| `human_into_mascot` / `mascot_into_human` | same | same | override | **20** | No |
| Unknown intent fallback | same | same | override | **20** | No |
| `image_generation` (non-intelligence) | editor generation helpers | registry | registry / override | **20** default | No |
| `premium_vision_analysis` | `PREMIUM_VISION_ANALYSIS_CREDITS` | registry override **5** | billed analysis | **5** | No |

**Financial behavior changed:** **No** (values preserved; sources unified).

## Workspace ownership map

| Concern | Component / module |
|---------|-------------------|
| Route entry | `studio-root-page.tsx` |
| Shell / layout | `studio-workspace-shell.tsx` |
| Tool surface | `studio-workspace-tool-panel.tsx` + tool strip |
| Story / director | Director V2 panels |
| Assets drawer | `studio-workspace-assets-drawer.tsx` |
| Production / export | `studio-workspace-production-panels.tsx` |
| Classic parallel | `studio-storyboard-editor.tsx` (legacy seam for S.2) |

## God components (seams identified, not rewritten)

1. `editor-canvas-workspace.tsx` (~3299) — dynamic import seam  
2. `studio-character-voice-library-section.tsx` (~1594)  
3. `editor-instruction-studio-workspace.tsx` (~1472)  
4. `studio-workspace-shell.tsx` (~657) — dynamic from home  
5. `animate/instant/page.tsx` (~2787) — Motion (out of Studio S.1 rewrite)

## Code splitting introduced

- `StudioWorkspaceShell` via `next/dynamic` in `studio-root-page.tsx`
- `EditorCanvasWorkspace` via `next/dynamic` in `editor-product-page.tsx`
