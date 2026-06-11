# Editor V2 — Image Instruction Studio Completion Report

## Object Intelligence V2

Module: `src/lib/editor-instruction-object-v2.ts`

Normalized categories: character, logo, text, product, packaging, clothing, tool, food, background, environment, vehicle, building, signage, other.

Each `EditorInstructionObjectV2` includes: id, label, category, confidence, description, suggestedActions[], layerId.

## Dynamic Action System

Module: `src/lib/editor-instruction-actions.ts`

Category → action matrix (clothing, packaging, text, background, character, logo, etc.).

UI shows only actions valid for the selected object category.

## Branding Workflow

Modules: `editor-instruction-branding.ts`, branding section in `editor-instruction-studio-workspace.tsx`

Flow: select object → add/replace logo → upload `BrandReferenceAsset` → placement hint → generate variant.

Supported on clothing, packaging, product, vehicle, building, signage categories.

## Multi Reference System

Module: `src/lib/editor-instruction-references.ts`

Reference types: SOURCE_IMAGE, LOGO_REFERENCE, STYLE_REFERENCE, PRODUCT_REFERENCE.

Variant generation sends source + optional logo/style/product references in payload and prompt.

## Prompt Builder V2

Module: `src/lib/editor-instruction-prompt-builder.ts` → `buildEditorInstructionPromptV2`

Handles branding blocks, preserve/do-not-modify clauses, multi-reference hints, sliders.

## Variant Comparison Center

Component: `src/components/editor/editor-instruction-comparison-center.tsx`

View, compare, rename, delete, notes, approval badges, lineage summary.

## Variant Approval Workflow

Module: `src/lib/editor-instruction-approval.ts`

States: draft → approved / archived. New variants do not auto-activate. Approve / Reject / Set Active in UI.

## Bulk Variant Generation

Modules: `editor-instruction-bulk.ts`, `editor-instruction-presets.ts`, API `POST /api/editor/instruction/variant/bulk`

Chef / Garden / Designer presets + generic 4-variant bulk.

## Studio Motion Handoff Audit

Module: `src/lib/editor-instruction-handoff.ts`

`resolveEditorInstructionHandoff` returns `activeVariantUrl` from **approved active** variant only.

Updated: `editor-studio-entry.ts`, `editor-motion-entry.ts`, handoff URLs include `editorVariantId` + `editorActiveVariant=1`.

## Version Lineage System

Module: `src/lib/editor-instruction-lineage.ts`

Parent/child variant tree from `parentVariantId`. Displayed in comparison center.

## Creator Presets

Chef, Garden, Designer presets with bulk generation shortcuts.

## Final UI Layout

Component: `editor-instruction-studio-workspace.tsx`

LEFT: original + active approved preview | CENTER: comparison | RIGHT: object/action/branding/refs/sliders/buttons

## Cleanup Matrix

| KEEP | ARCHIVE | DELETE LATER |
|------|---------|--------------|
| Instruction studio V2 stack | `editor-instruction-studio-panel.tsx` (superseded) | SAM2 click segment routes |
| Object/actions/prompt/handoff libs | Canvas transform handles (advanced mode) | Mask gate dialogs |
| Comparison + workspace UI | Click trace debug panel | Lasso overlays |
| Variant API + bulk API | Legacy photo_edit workspace | Selection QA admin panels |

## I18N Audit

Namespace `editor.instructionStudio.v2.*` — full NL/EN parity for categories, actions, branding, approval, presets, comparison.

## Tests / Build Status

See CI: `editor-instruction-studio-v2.test.ts`, updated `editor-instruction-studio.test.ts`.
