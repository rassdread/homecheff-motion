# Editor Sub-Object Segmentation Fix Report

## Prompt To Sub-Layer

When `EditorClickSegmentPrompt` is shown (empty canvas or approximate parent click) and the user chooses **globe**, **logo**, **tie**, **person**, **text**, **product**, or **Select this object**, the workspace calls `/api/editor/segment/click` with:

- `imageUrl` / `backgroundStorageKey`
- `clickPoint`
- `objectHint` (prompt)
- `parentLayerId` / `targetBounds` when a parent approximate layer exists

On success, `createSubObjectLayer` + `applySegmentToSubObjectLayer` produce a new `EditorCanvasLayer` with:

| Field | Value |
|-------|--------|
| `label` | Prompt display label (e.g. Globe, Logo) |
| `parentObjectId` | Parent approximate layer id |
| `selectionShape.selectionMode` | `mask` |
| `selectionShape.maskUrl` | Replicate/SAM3 mask |
| `selectionShape.polygon` | Segmentation contour |
| `selectionShape.boundingBox` | Tight bbox from mask |
| `metadata.segmentationSource` | `replicate_sam3` (via shape) |
| `metadata.promptCreatedSubLayer` | `true` |
| `layerSource` | `segment_prompt` |

The new layer is set active; parent is not mutated.

Implementation: `src/lib/editor-sub-object-layer.ts`, `editor-canvas-workspace.tsx` (`runPromptSubLayerSegmentation`).

## Parent Child Layer Model

`attachSubObjectLayer` appends the child to `document.objects` and adds the child id to `parent.children` only. Parent `label`, `bounds`, and `selectionShape` are unchanged.

Example after globe prompt inside Globe Man:

```
Globe Man (parent, approximate bbox)
└─ Globe (child, mask + green contour)
```

## Template Part Priority Fix

`pickPartAtPoint` deprioritizes `estimatedBounds: true` template parts when:

- A non-estimated part exists for the same category at the point, or
- `realSubLayerCategoriesAtPoint` blocks that category (prompt-created mask present).

`pickHierarchicalAtPoint` checks `pickPromptSubObjectAtPoint` **before** part-mode template picking, so PART_BOUNDS cannot override a real segmentation child.

## Real Mask Hit Priority

`pickTopEditorObjectAtPoint` sort order:

1. Hit method: **mask** > polygon > bbox
2. Prompt-created sub-objects (`parentId` + mask)
3. Smaller mask bbox area (child over parent)
4. Higher `zIndex` (boosted in `buildEditorObjectsFromLayers` for child/mask layers)

`pickHierarchicalAtPoint` delegates to prompt sub-layers first.

## Precise Sub-Object Feedback

On successful prompt segmentation, Dutch (and English) toast messages:

| Prompt | NL |
|--------|-----|
| globe | Wereldbol geselecteerd |
| logo | Logo geselecteerd |
| tie | Stropdas geselecteerd |
| text | Tekst geselecteerd |
| person | Persoon geselecteerd |
| product | Product geselecteerd |
| object | Object geselecteerd |

`EditorSelectionOutline` shows green contour when `isApproximateEditorSelection` is false (precise mask). No large dashed bbox for precise children.

Keys: `editor.clickSegment.selected*` in `nl.ts` / `en.ts`.

## Globe Man Validation

Trace scenarios (synthetic Globe Man parent + segmentation polygons in tests):

| Action | Expected |
|--------|----------|
| Click globe → Select: globe | Child `Globe` with `maskUrl`, parent preserved |
| Click tie → Select: tie | Child `Tie` with mask (via same pipeline) |
| Click chest → Select: logo | Child `Logo` wins over face PART_BOUNDS |
| Click body → Select: person | Child under Globe Man, not text overlap |
| Click existing globe mask | `pickPromptSubObjectAtPoint` selects Globe child |

Tests: `src/lib/editor-sub-object-segmentation.test.ts` (9 cases).

## Tests / Build Status

Targeted: `npx tsx --test src/lib/editor-sub-object-segmentation.test.ts` — **9/9 pass**.

Full suite: run `npm run lint`, `npm run build`, `npm run test` before commit (Riedel).
