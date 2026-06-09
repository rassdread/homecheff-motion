# Editor Phase 2 — Object Detection & Semantic Layers Report

**Date:** 2026-06-09  
**Scope:** Semantic layer model, vision mapper, taxonomy, UI, save, tests  
**Status:** Complete

## Semantic Layer Model

Extended `src/types/homecheff-visual-editor.ts`:

- `EditorSemanticLayer` — id, label, type, category, bounds, confidence, visible, locked, editable, source, parentId, children, metadata
- Categories: character, body, face, clothing, accessory, logo, product, package, label, prop, environment, background, text, brand_element, unknown
- Sources: vision, semantic_record, fingerprint, manual, generated, composition_graph
- `EditorIdentityRelevance` for protected vs editable objects
- `EditorCanvasDocument.semanticLayers` + `layerOperations` audit trail

## Vision To Layers Mapper

`buildEditorSemanticLayersFromVision()` in `src/lib/editor-semantic-layers-from-vision.ts`

Inputs: vision analysis, style DNA, semantic record, identity fingerprint  
Uses: keyFeatures, suggestedPreserve, identityShapeMarkers, colors, environmentHints, accessoryPattern, referencePlacements, dynamicAccessories

HomeCheff-specific labels filtered unless `brandIdentity` / `assetFamily` matches.

Heuristic bounds per object type; low-confidence / unknown types marked `metadata.estimatedBounds`.

## Object Taxonomy

`src/lib/editor-semantic-layer-taxonomy.ts` — keyword rules for person, mascot, product, scene, brand asset with parent/child hints.

## Layer Tree UX

`EditorLayerTree` — grouped by category, nested parent/child, visibility/lock toggles, confidence + source badges, estimated badge.

## Canvas Semantic Overlays

`EditorCanvasPreview` — bounding boxes, hover labels, selected/locked/estimated styling, hidden layers excluded, move gated by eligibility.

## Properties Panel

Category, source, confidence, identity relevance, parent, estimated hint; operations filtered by eligibility.

## Action Eligibility

`resolveEditorLayerActionEligibility()` — identity markers protected; accessories editable; background replace-only; placement targets fully editable.

## Semantic Layer Save

`buildEditorSavePayload()` now includes `semanticLayers[]`, `editorObjects[]`, `compositionGraph`, `layerOperations[]`, semantic record patch with keyFeatures + preserveRules.

## Upload Support

Upload flow unchanged: `runEditorVisionAndObjectDetection` → new mapper → semantic layers for upload source kind.

## Tests/Build Status

- `src/lib/editor-semantic-layers.test.ts` — 12 Phase 2 tests
- Updated `src/lib/editor-canvas.test.ts`
- **Build:** pass
- **Tests:** **2364/2364** pass

## Rollback

Revert this commit to restore Phase 1 flat keyFeatures layers without semantic taxonomy.

## Files (main)

- `src/lib/editor-semantic-layers-from-vision.ts`
- `src/lib/editor-semantic-layer-taxonomy.ts`
- `src/lib/editor-layer-action-eligibility.ts`
- `src/lib/editor-layer-tree-build.ts`
- `src/types/homecheff-visual-editor.ts`
- `src/components/editor/editor-layer-tree.tsx`
- `src/components/editor/editor-canvas-preview.tsx`
- `src/components/editor/editor-properties-panel.tsx`
