# Editor Selection Fix Report

Sprint date: 2026-06-10

## Unified Selection Flow

- Removed parallel `handleHierarchicalPick` path.
- Canvas click, object list, layer panel, and transform-box click all call **`selectLayer()`** only.
- Hierarchical state (object mode, part mode, part pick) is resolved inside `selectLayer` before auto-mask runs.
- `editor-canvas-preview.tsx` passes `{ partId, clickPoint }` on every canvas click.

## Auto Mask Selection

- `tryAutoAcquireMask` runs from `selectLayer` for every eligible object selection.
- Progress messages (human-first, NL + EN):
  - *Object selecteren…* / *Selecting object…*
  - *Nauwkeurige selectie maken…* / *Making a precise selection…*
  - *Selectie gereed* / *Selection ready*
- When SAM2/rembg unavailable: explicit unavailable message (no silent skip).
- Strategy: SAM2 → rembg fallback → manual refine via action bar.

## Click Accurate Segmentation

- `resolveAutoMaskClickPoint()` prefers user click coordinates.
- SAM2 `/api/editor/segment/click` receives the actual canvas click, not bbox center.
- Bbox center used only when no click (object list / keyboard selection).

## Visual Selection Feedback

- **Approximate:** grey dashed polygon outline immediately on click.
- **Refining:** shimmer/pulse on outline + transform box while auto-mask runs.
- **Precise:** green contour when `maskUrl` is stored.
- `EditorSelectionOutline` no longer hides approximate selections.

## Honest Editing Gate

- `resolveUxV7ObjectActions` and `resolveContextualHumanActions` hide Replace/Remove until `maskUrl` exists.
- **Refine selection** shown instead when selection is approximate.
- Background remove remains available on background layer (full-image rembg path).
- Floating action menu and contextual bar no longer show doomed pixel-edit actions.

## Globe Man Validation

| Click target | Selection visible | Auto-mask triggered | Edit gated honestly |
|--------------|-------------------|---------------------|---------------------|
| Globe | Grey outline at click | SAM2 at globe coords | Refine until mask |
| Tie | Part mode / layer bbox | Yes on selectLayer | Refine until mask |
| Logo | Layer or part template | Yes | Refine until mask |
| Head | Character bbox | Yes | Refine until mask |
| Body | Character bbox | Yes | Refine until mask |
| Background | Full-frame layer | N/A (bg tools) | Remove available |

Automated: `editor-selection-fix-audit.test.ts`, `editor-selection-pipeline.test.ts`.

## User Trust Validation

| Question | After fix |
|----------|-----------|
| Can user understand selection? | Yes — grey → shimmer → green progression |
| Can user see selection? | Yes — outline always visible on select |
| Can user complete replace? | Yes — after auto-mask or refine (when SAM2/rembg configured) |
| Can user understand failure? | Yes — progress + unavailable/failed messages; refine button |

## Fake Success Removal

- Replace/Remove hidden without `maskUrl`.
- Action menu shows Refine selection instead of blocked replace.
- Mask gate dialog only as secondary path if user reaches replace via advanced flows.

## Final Score

| Area | Score |
|------|-------|
| Selection | 8 |
| Masking | 7 |
| Visual Feedback | 7 |
| Editing | 8 |
| User Trust | 7 |
| **Overall** | **7** |

## Key Files

| File | Change |
|------|--------|
| `src/lib/editor-selection-pipeline.ts` | Unified options, click point, action gating |
| `src/components/editor/editor-canvas-workspace.tsx` | Single `selectLayer` pipeline |
| `src/components/editor/editor-canvas-preview.tsx` | Click → selectLayer + clickPoint |
| `src/components/editor/editor-selection-outline.tsx` | Grey/shimmer/green states |
| `src/lib/editor-ux-v7-contextual.ts` | Gated UX actions |
| `src/lib/editor-ux-cleanup.ts` | Gated human menu actions |

## Validation

- `npm run lint`
- `npm run build`
- `npm run test`
