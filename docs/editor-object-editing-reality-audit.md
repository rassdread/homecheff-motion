# Editor Object Editing Reality Report

**Date:** 2026-06-10  
**Question:** Can a normal user select an object, modify it, see the image change, and save — on a real uploaded image?  
**Method:** Code-path audit only. No new features.  
**Automated checks:** `src/lib/editor-object-editing-reality-audit.test.ts` (11 tests)

---

## Verdict (definitive)

**No — not reliably, not without expert steps.**

A normal user can upload an image, see object chips, and click actions. **Pixel-level object editing only works when `selectionShape.maskUrl` exists and OpenAI masked-edit APIs succeed.** Fresh uploads use **template bounding boxes** (`BOUNDS_BY_TYPE` in `editor-semantic-layers-from-vision.ts`). The canvas paints **`backgroundUrl` only** (`editor-canvas-preview.tsx` line 183). Most clicks update **metadata** or **overlays**, not the underlying image.

**Exception path that works:** User selects object → SAM2/rembg refine → masked replace/remove → `backgroundUrl` updates → visible change on canvas → save via Review or local session.

---

## Object Selection Reality

| Object Type | Detected | Selectable | Highlight Visible | Editable | Confidence |
|-------------|----------|------------|-------------------|----------|------------|
| Mascot | Partial | Partial | Partial | Partial | Low |
| Person | Partial | Partial | Partial | Partial | Low |
| Face | Partial | **No** | **No** | **No** | None |
| Globe | Partial | Partial | Partial | Partial | Low |
| Logo | Partial | Partial | Partial | Partial | Medium |
| Text | Partial | Partial | Partial | Partial | Low |
| Background | Yes | Yes | Partial | Partial | Medium |
| Clothing | Partial | Partial | Partial | **No** | None |
| Accessory | Partial | Partial | Partial | Partial | Low |

**Detected** = vision `keyFeatures` + optional ONNX (`/api/editor/detect`). Not pixel-accurate.  
**Selectable** = `pickTopEditorObjectAtPoint` bbox hit-test or object chip (`EditorHumanObjectList`).  
**Highlight** = in `humanFirst` mode, **only the selected layer** shows a box (`editor-canvas-preview.tsx` 254–256). Unselected objects are invisible on canvas until chip click.  
**Editable** = masked OpenAI path only; clothing/face blocked.

---

## Click Test

| Step | Expected | Actual |
|------|----------|--------|
| Click object on canvas | Outline + active | Hit-test works on `detectedObjects` bbox; **no visible box until selected** in humanFirst |
| Object chip click | Select + actions | **Works** — `EditorHumanObjectList` → `selectLayer` |
| Context actions appear | Replace/remove/cutout | **Works** when layer selected — `EditorContextualActionBar` |
| Selection persists | Until changed | **Works** — React state + `persist()` localStorage |
| Click face | Select face | **Fails** — face hidden as technical sub-part |
| Click wrong bbox | Wrong object | **Common** — template bounds misaligned with real geometry |

**Failures:** invisible hit targets in humanFirst; approximate bboxes; face not in chip list; placement selection blocks layer picking.

---

## Mask Truth Audit

| Stage | Geometry | Real? | Estimated? | Notes |
|-------|----------|-------|------------|-------|
| After upload | Bounding box template | No | Yes | `BOUNDS_BY_TYPE` — not from image pixels |
| ONNX merge | Bounding box | Yes | No | Only if local model runs + IoU match |
| `/api/editor/segment` | Mask (rembg) or octagon | Partial | If heuristic | `REMBG_API_URL` required for real mask |
| `/api/editor/segment/click` | SAM2 mask + cutout | Yes | No | `SAM2_SEGMENTATION_URL` required |
| Manual lasso | Polygon | Yes | No | User-drawn |
| `runMaskedEdit` | **Requires maskUrl** | — | — | Aborts without it (workspace 394–397) |

**Unavailable by default:** SAM2 mask, rembg mask, raster alpha hit-test.

**Fallback:** Rectangle bbox + dashed amber “approximate” styling.

---

## Replace Reality Test

| Target | Selection | Mask | API | Pixels | Canvas | Save |
|--------|-----------|------|-----|--------|--------|------|
| Logo | Partial | Usually no | `/api/editor/edit/replace` if mask | If mask | `backgroundUrl` swap | localStorage / Review |
| Globe | Partial | Usually no | Same | If mask | Same | Same |
| Clothing | Partial | No | — | No | No | — |
| Mascot | Partial | Usually no | Same | If mask | Same | Same |
| Generic object | Partial | Usually no | Same | If mask | Same | Same |

**Without mask:** `handleOperation("replace")` → `applyEditorLayerOperation` → **no pixel change** (`homecheff-visual-editor-foundation.ts` default branch).

**With mask:** `runMaskedEdit` → `executeEditorMaskedReplaceApi` → **`backgroundUrl` updated** — **only true replace path**.

UX v7 Replace opens `EditorMagicReplacePanel` first — still needs mask at Apply time.

---

## Remove Reality Test

| Target | Pixels removed | Inpaint | Canvas update | Save |
|--------|----------------|---------|---------------|------|
| Logo/object/mascot (no mask) | **No** | **No** | Layer removed from list | localStorage |
| Logo/object/mascot (with mask) | **Yes** | **Yes** | `backgroundUrl` swap | localStorage |
| Background element | Partial | No | Mask on layer metadata | localStorage |

`handleRemoveBackground` calls segment API and stores mask on layer — **`backgroundUrl` unchanged**.

---

## Background Reality Test

| Tool | Modifies pixels? | Evidence |
|------|------------------|----------|
| Remove background | **No** (default) | Mask stored on layer; img src unchanged |
| Replace background | **Only if** bg has `maskUrl` | `runMaskedEdit("replace", bgLayer, prompt)` |
| Brand background | **No** | Gradient skipped if `linear`; solid hex may break as `<img src>` |
| Gradient background | **No** | `insertBrandKitItemOnCanvas` keeps `backgroundUrl` for linear gradients |
| Transparent export | **No** on canvas | `exportSettings.production.transparentBackground` flag only |
| Blur / sky | **Broken** | `runMaskedEdit` without background mask |

---

## Add Object Reality Test

| Action | Visible on canvas | Persists reload | Server library |
|--------|-------------------|-----------------|----------------|
| Insert logo (brand kit) | **No** | Yes (importedLayers) | No |
| Insert mascot (brand kit) | **No** | Yes | No |
| Insert cutout | **No** | Yes (cutoutUrl on layer) | Yes via `persistCutoutToLibrary` |
| Library drag (compose) | **No** on main preview | Yes | No |
| Placement add logo | **Yes** | Yes | Via Review save |
| Move/resize/rotate placement | **Yes** | Yes | localStorage |
| Move/resize layer | Overlay only | Yes | localStorage |

**Client composed download:** `exportEditorCanvasWithPlacements` composites placements on background — only for `pixel_overlay` placements, not `importedLayers`.

---

## Clothing / Appearance Audit

| Feature | Status |
|---------|--------|
| Change jacket color | **Partial** — masked `magic_replace` if user has mask + prompt |
| Change jacket type | **Placeholder** — `change_clothing` hidden from UI |
| Replace clothing | **Partial** — same as replace |
| Change expression | **Placeholder** |
| Change appearance button | **Not implemented** — closes menu only |
| Body designer sliders | **Partial** — params change; no pixel repaint |

---

## Pixel Change Audit

| Action | Pixels change? | Metadata only? |
|--------|----------------|----------------|
| Masked replace | Yes | — |
| Unmasked replace | No | Yes |
| Masked remove | Yes | — |
| Unmasked remove | No | Yes |
| Background segment | No | Yes |
| Background blur | No | Yes |
| Cutout | No (on canvas) | Yes |
| Brand kit insert | No | Yes |
| Placement insert | Yes (overlay) | Partial |
| Layer move/resize | No | Yes |
| Motion prepare | No | Yes |

---

## User Expectation Test

**Scenario:** User uploads mascot image.

| Task | Completable? | Exact blocker |
|------|--------------|---------------|
| 1. Change jacket | **No** | No mask; `change_clothing` placeholder; `edit_appearance` no-op |
| 2. Replace logo | **No** (typical) | Approximate bbox; mask required for pixels |
| 3. Remove background | **No** (visible) | Segment does not update `backgroundUrl` |
| 4. Add HomeCheff logo | **No** (brand kit) | `importedLayers` not rendered; use placement panel |
| 5. Save | **Partial** | Toolbar draft = localStorage; Review for server |
| 6. Reopen | **Partial** | Same browser localStorage; `backgroundUrl` kept if masked edit ran |

**Score: 0/6 fully complete on default path.**

---

## Final Object Editing Score

| Dimension | Score (0–10) | Rationale |
|-----------|--------------|-----------|
| Selection | 3 | Chips work; geometry approximate; face missing |
| Masks | 2 | Env-gated; not created on upload |
| Replace | 3 | Works with mask + OpenAI only |
| Remove | 3 | Same gate |
| Background | 2 | Segment metadata; blur broken |
| Insert | 2 | Placements yes; brand kit invisible |
| Persistence | 4 | localStorage reliable; server needs Review |
| Visual feedback | 3 | Canvas ≠ document state |
| Pixel editing | 2 | Rare success path |
| **Overall** | **3/10** | Not Canva/Photoshop/Runway level |

---

## Top 15 Object Editing Blockers

1. `runMaskedEdit` requires `maskUrl` — fresh layers have template bboxes only (**critical**)
2. Canvas = `backgroundUrl` only — no compositor (**critical**)
3. humanFirst hides unselected layer boxes (**critical**)
4. Template `BOUNDS_BY_TYPE` not image geometry (**critical**)
5. Unmasked remove/replace = metadata only (**critical**)
6. Background remove does not inpaint `backgroundUrl` (**high**)
7. Brand kit → `importedLayers` invisible (**high**)
8. `edit_appearance` / `change_clothing` no-ops (**high**)
9. Face not selectable (**high**)
10. Toolbar draft ≠ server save (**high**)
11. Cutout SAM2 click at transform center (**medium**)
12. Approximate layers hide contour outline (**medium**)
13. Server export ignores placements unless client export (**medium**)
14. `planEditorSmartRemove.ready` misleading without maskUrl (**medium**)
15. Mask hit-test uses polygon not raster (**medium**)

---

## Completion Roadmap (object editing only)

### Phase 1 — Must fix before production

1. **Auto-mask or block:** On replace/remove, require refine step OR auto-run segment before edit; align `plan.ready` with `maskUrl`.
2. **Canvas compositor:** Render `importedLayers`, cutouts, placements on preview; same pipeline for export.
3. **Selection visibility:** Show approximate targets in humanFirst (or always show chips-first flow).
4. **Background inpaint:** After remove-background segment, update `backgroundUrl` or show cutout composite.
5. **Hide/no-op cleanup:** Remove `edit_appearance` no-op; hide blur until mask exists; honest clothing labels.

### Phase 2 — Should fix

1. ONNX/vision bounds quality or mandatory refine-on-first-select.
2. Face as selectable part with real geometry.
3. Placement + importedLayers unified compositor for download.
4. Server save on successful pixel edit (auto library snapshot).
5. SAM2 click at user pointer, not transform center.

### Phase 3 — Future (existing scope)

1. Raster mask hit-testing.
2. Clothing-specific masked regions from hierarchy parts.
3. Body designer → rendered preview layer.

---

## Answer to the goal question

| Step | Works today? |
|------|--------------|
| Select an object | **Partially** — via chips or invisible bbox click |
| Modify that object | **Rarely** — only masked OpenAI on `backgroundUrl` |
| See the image change | **Only** when `backgroundUrl` updates; not for cutouts/brand kit |
| Save the result | **Partially** — localStorage always; server via Review |

**HomeCheff Editor cannot truly edit objects inside images at Canva/Photoshop AI level today.** The architecture supports it at the masked-edit API layer; the default user path does not reach that layer.
