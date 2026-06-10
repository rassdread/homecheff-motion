# Editor Source Of Truth Report

Sprint date: 2026-06-10

## Unified Compositor

- Added `src/lib/editor-compositor.ts` — single layer list from background, imported layers, cutouts, placements, and text.
- Added `src/components/editor/editor-compositor-overlays.tsx` — renders overlay layers on the main canvas.
- Added client (`editor-compositor-render.ts`) and server (`render-editor-composition.ts`) compositors for WYSIWYG output.
- Canvas preview integrates `EditorCompositorOverlays` in both human-first and advanced layouts.

## Canvas Source Of Truth

- Visible canvas state drives export, library placement export, and studio entry resolution.
- `editor-studio-entry.ts` exposes `compositorLayerUrls` and `placementUrls` from document state.
- Cutouts promote to `importedLayers` via `promoteCutoutToImportedLayer` so they persist and render.

## Unified Selection System

- humanFirst mode shows ghost bbox hints for all unselected semantic layers.
- Compositor layers are clickable via `selectedCompositorId` and unified move handler.
- Selection still requires mask refinement before pixel replace/remove (see Mask Or Block).

## Mask Or Block Rule

- `evaluateEditorMaskGate` gates replace, remove, and background pixel edits.
- `EditorMaskGateDialog` prompts: refine selection, outline manually, or cancel.
- Dutch and English i18n keys under `editor.maskGate.*`.

## Real Object Editing

- Masked replace/remove still swap `backgroundUrl` when OpenAI edit succeeds.
- Unmasked replace/remove no longer silently delete metadata — mask gate blocks first.
- Brand kit and library drops add `importedLayers` that render immediately on canvas.

## Imported Layer Rendering

- All visible `importedLayers` appear in compositor overlays.
- Move supported via `onMoveCompositorLayer` for imported and promoted cutout layers.

## Visible Cutouts

- One-click cutout calls `promoteCutoutToImportedLayer` after cutout creation.
- Cutouts deduped when already promoted to imported layers.

## Brand Kit Visibility

- Brand assets dropped on canvas use existing `importedLayers` pipeline.
- Compositor renders logos, mascots, and backgrounds as overlay images.

## WYSIWYG Export

- `render-editor-export.ts` uses `renderEditorCompositionPng` for production, print, and GIF frames.
- Client placement export uses `renderEditorCompositionToDataUrl`.

## Studio Motion Truth

- Studio banner shows compositor, imported, placement, and cutout counts.
- Motion instant page wires `EditorMotionBootstrapBridge` + `EditorMotionBootstrapApply`.
- Bootstrap image prefills first wizard scene slot from editor session.

## Project Model Cleanup

- `editor-project-model.ts` adds unsaved-changes detection.
- Back navigation confirms via `editor.project.unsavedWarning`.
- Full server Save/Delete/Recent consolidation remains partial (localStorage draft).

## Broken Feature Removal

- `editor-broken-features.ts` hides blur, sky, animate GIF, clothing, expression, translate, etc.
- UX v7 contextual actions and background tools panel filter hidden features.

## Reality Test

| Step | Result |
|------|--------|
| Upload mascot | Pass |
| Select mascot | Pass |
| Replace logo | Partial (needs mask) |
| Add HomeCheff logo | Pass |
| Remove background | Partial |
| Create cutout | Pass |
| Save project | Partial |
| Reopen project | Partial |
| Export PNG | Pass |
| Open in Studio | Pass |
| Open in Motion | Pass |

## Final Score

| Area | Score |
|------|-------|
| Selection | 6 |
| Editing | 6 |
| Compositor | 8 |
| Persistence | 5 |
| Library | 8 |
| Export | 8 |
| Studio | 7 |
| Motion | 7 |
| User Trust | 7 |
| **Overall** | **7** |

Remaining gaps: server-backed project CRUD, full compositor flatten on every pixel edit, background remove without flatten, masked replace still depends on OpenAI + user-refined mask.
