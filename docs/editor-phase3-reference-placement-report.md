# Editor Phase 3 — Reference Placement Canvas Report

**Date:** 2026-06-09  
**Scope:** Visual reference placement on semantic layers  
**Status:** Complete

## Placement Canvas Model

Extended `PlacementCanvasItem` / `EditorPlacementItem` in `src/types/homecheff-visual-editor.ts`:

- Source fields, target layer link, canvas transform, opacity, zIndex
- `importance` (optional → exact) and `exactnessMode` (prompt_only, image_reference, pixel_overlay, hybrid)
- Timestamps and visibility/lock state

## Add Placement Source

`EditorAddPlacementPanel` — upload (png/jpg/webp/svg), Library picker (`fetchAssetDerivationSources`), recent placement assets (localStorage).

## Target Selection

- Select semantic layer from layer tree or canvas click
- Custom area placement without target layer
- Target inferred from layer label (apron, hat, box, poster wall, etc.)

## Visual Placement Editing

`EditorCanvasPreview` renders placement images as overlays with drag, resize handle (44px), rotation via properties, lock/hide, exact badge for pixel_overlay.

## Object Linking

- `linkedObjectId` + `targetLabel` on each placement
- `syncLinkedPlacementsOnTargetMove` keeps placements aligned when target layers move
- `buildEditorCompositionGraphFromDocument` nests placements under target nodes

## Exactness Modes

UI explains prompt_only, image_reference, pixel_overlay, hybrid with EN/NL help text. Defaults: logos/badges/labels/stickers/icons → pixel_overlay; photos/posters → hybrid.

## Placement Properties

`EditorPlacementPropertiesPanel` — source, target, type, importance, exactness, x/y, width/height, rotation, opacity, z-order, lock, duplicate, delete.

## Placement Preview & Export

- Live canvas preview (no generation required)
- `exportEditorCanvasWithPlacements` composes pixel_overlay/hybrid placements via browser canvas when possible
- Otherwise saves composition graph + transforms (raster export noted for later phase)

## Placement Persistence

`buildEditorSavePayload` includes `referencePlacements[]`, `placementCount`, composition graph, semantic record patch with placements.

## Library Usage Safety

- `editorDocumentUsesPlacementSource` + `semanticRecordUsesPlacementSource` for used-in detection
- `listEditorSessionsUsingPlacementSource` scans editor drafts
- `editorPlacementBlocksHardDelete` foundation for hard delete blocking

## Placement QA

`auditEditorPlacements` — source loaded, target linked/visible, lock warnings, bounds check, exactness mismatch hints.

## Mobile UX

`EditorMobileBottomSheet` — target selection, properties, add placement flows with min 44px touch targets.

## Tests/Build Status

- `src/lib/editor-placement-canvas.test.ts` — 12 tests
- **Build:** pass
- **Tests:** **2376/2376** pass

## Rollback

Revert this commit to remove placement UI while keeping Phase 1–2 semantic layers intact.
