# Editor Vision V4 Report

## Part Segmentation Audit

See `docs/editor-vision-v4-part-segmentation-audit.md`. SAM2 supports click + bbox + hint per part; V4 seeds part tree from vision taxonomy and upgrades via SAM2 in part-selection mode.

## Part Object Model

- `EditorObjectPart` type with mask, contour, bbox, cutout, transform, animation profile.
- `EditorObjectHierarchy` on document keyed by root object id.
- `buildDefaultMascotParts()` seeds Head, Face, Torso, Arms, Globe, Tie, Logo.
- Parts attached to `EditorObject.parts[]` during document enrich.

## Hierarchical Selection

- Two-phase picking: first click selects character/object; second click enters part mode.
- `editor-hierarchical-selection.ts` — part hit testing, hover highlights, selection state.
- `EditorPartSelectionOverlay` shows hover/selected part contours.
- Workspace UI: part mode banner, exit, save to library.

## Object Transform Controls

- `editor-object-transforms.ts` — move, scale, rotate, duplicate, hide, lock per part.
- Non-destructive: transforms stored on part `transform` and `localTransform`, not baked into image.
- `applyTransformToDocument()` updates hierarchy without mutating source.

## Logo Control System

- `editor-logo-controls.ts` — replace, move, scale, rotate, lock, duplicate for logo parts.
- `logoReadyForPrint` / `logoReadyForAnimation` / `logoReadyForExport` readiness checks.
- Mask-aware placement via part bbox and mask metadata.

## Motion Animation Metadata

- `EditorObjectAnimationProfile` — float, rotate, pulse, wave, orbit, bounce.
- `EditorPartAnimationProfile` — nod, wave, spin, rotate, bob, sway.
- Defaults: globe→rotate, logo→spin, arm→wave, head→nod.

## Motion Preview

- `EditorMotionPreviewOverlay` — lightweight loop preview (rotation, float, pulse) on canvas.
- Toggle from part mode UI; no final render required.

## Character Expression Foundation

- `EditorCharacterExpression` — neutral, happy, focused, surprised, confident.
- Stored on face/head parts; `expressionPromptHint()` ready for future generative replace.

## Library Integration

- `EditorPartLibraryAsset` — asset type, parent object, part category.
- `savePartToLibrary()` persists Mascot Head, Arm, Logo, Globe cutouts for Editor/Studio/Motion reuse.

## Studio Motion Handoff

- `buildStudioMotionHandoff()` — hierarchies, transforms, animation profiles, expressions, library assets, cutouts, motion preparations.
- Included in `buildEditorSavePayload()` as `studioMotionHandoff`.
- `enrichEditorDocument()` auto-builds handoff on save.

## Human First UX

- `editor-part-human-labels.ts` — Character, Arm, Face, Logo, Globe (no segmentation jargon).
- `sanitizeEditorUserLabel()` strips technical terms from UI.
- Advanced mode unchanged; visual mode uses human labels only.

## Tests / Build Status

- `src/lib/editor-vision-v4.test.ts` — 15 tests.
- Run: `npx prisma validate` → `npx prisma generate` → `npm run lint` → `npm run build` → `npm run test`.
