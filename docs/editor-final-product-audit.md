# Editor Final Product Audit

**Date:** 2026-06-10  
**Scope:** Vision V1–V7, UX cleanup, production pipeline — evidence only, **no new features**  
**Method:** Code trace (components → handlers → APIs → storage → canvas render)  
**Automated checks:** `src/lib/editor-final-product-audit.test.ts` (15 tests)

---

## Executive summary

The Editor has extensive **planning, detection, and metadata infrastructure**, but the **visible canvas is not the source of truth** for edits. Users see many tools; most operations either (a) update document JSON in `localStorage`, (b) require a mask the user does not have yet, or (c) download a file that does not match what they composed.

**Root cause in one sentence:** `EditorCanvasPreview` paints a single `backgroundUrl` image plus selection boxes and placement overlays — not `importedLayers`, cutout composites, or server-exported compositions.

---

## User Expectation Audit

| Screen | Action | Expected | Actual | Gap |
|--------|--------|----------|--------|-----|
| Canvas | Replace | Object changes visually | Panel → masked OpenAI only if `maskUrl`; else metadata | partial |
| Canvas | Remove | Object gone, bg filled | Inpaint with mask; else layer removed from list only | partial |
| Toolbar | Save draft | Recoverable project | `localStorage` only; no `/api/editor/save` | misleading |
| Review | Save to Library | Reusable asset | Server persist via review path (auth required) | partial |
| Export hub | Production/print | WYSIWYG file | Resizes `backgroundUrl` only | partial |
| Export hub | GIF | Animated GIF | Single-frame GIF from background | misleading |
| Brand kit | Insert logo | Logo on canvas | `importedLayers` appended, **not rendered** | broken |
| Cutout | One-click | Transparent object on canvas | `cutoutUrl` stored; preview unchanged | partial |
| Magic bar | Submit | Instant edit | Plan only until Apply | partial |
| Motion link | Open in Motion | Pre-filled wizard | URL params exist; **UI not wired** | broken |
| Post-upload picker | Magic bar | Edit before workspace | `onMagicCommand` not passed | missing |
| Background | Blur | Blurred pixels | `runMaskedEdit` aborts without mask | broken |
| Animate | Animate object | Motion clip | CSS keyframe overlay | partial |
| Duplicate | Duplicate | Visible copy | Second bbox; hidden in humanFirst | partial |
| Studio | Use in Studio | Assets in storyboard | Banner + local session read only | partial |

Full rows: `src/lib/editor-final-product-audit.ts` → `USER_EXPECTATION_AUDIT`.

---

## Click To Result Audit

| Action | Handler | API | Pixels? | Server persist? | Break |
|--------|---------|-----|---------|-----------------|-------|
| Replace | `handleMagicReplaceApply` → `runMaskedEdit` | `/api/editor/edit/replace` | If mask | Blob result | No mask → no pixels |
| Remove | `handleOperation(delete)` | `/api/editor/edit/remove` | If mask | Blob result | No mask → layer metadata only |
| Cutout | `handleOneClickCutout` | `/api/editor/segment/click` | No on canvas | `/api/editor/save` via `persistCutoutToLibrary` | Preview doesn't show cutout |
| Duplicate | `applyEditorLayerOperation` | — | No | localStorage | Overlay only |
| Animate | `attachMotionPreview` | — | CSS only | localStorage | Not a file |
| Motion export | `EditorExportHubPanel` | `/api/editor/export/motion-ready` | No | Local `libraryExports` | JSON manifest |
| Poster/print | `EditorExportHubPanel` | production/print routes | Download only | Local metadata | Background-only render |
| Library save | `EditorReviewPanel` | `/api/editor/save` | — | Prisma entity | Not toolbar draft |
| Background remove | `handleRemoveBackground` | `/api/editor/segment` | Partial | Mask on layer | Often no bg pixel change |
| Background blur | `handleBackgroundTool` | masked replace | No | — | No background mask |
| Brand kit | `insertBrandKitItemOnCanvas` | — | No | localStorage | `importedLayers` not painted |
| Magic edit | `handleV7CommandSubmit` → Apply | varies | After Apply | varies | Two-step; some steps no-op |

Evidence: `editor-canvas-workspace.tsx`, `editor-canvas-preview.tsx`, `render-editor-export.ts`.

---

## Object Selection Audit

| Type | Click selectable? | Reliable? | Blocker |
|------|-------------------|-----------|---------|
| Mascot | Yes (bbox) | No | `BOUNDS_BY_TYPE` templates / ONNX optional |
| Logo | Yes | No | Template bounds; placements separate |
| Globe | Yes | No | Keyword + template |
| Face | Sub-part only | No | `PART_BOUNDS` inside mascot; hidden from pills |
| Text | Yes | No | Vision seed, no OCR geometry |
| Background | Yes (canvas) | Yes | Full frame; not in object chips |

**Detection pipeline:** Upload → `analyzeAssetStyleDnaApi` + `detectEditorObjectsApi` → `buildEditorSemanticLayersFromHybrid` → layers without `selectionShape`.

**Masks appear after:** SAM2 click (`/api/editor/segment/click`), rembg (`/api/editor/segment`), or manual lasso.

**What prevents true object editing today:**
1. Initial selection is approximate rectangles, not segmentation.
2. `runMaskedEdit` hard-requires `maskUrl` for pixel edits.
3. Mask hit-testing uses polygon contour, not raster alpha.
4. One-click cutout SAM2 click uses layer transform center, not user click.
5. SAM2/rembg return 503 when env URLs unset.

---

## Real Image Editing Audit

| Operation | Status | Evidence |
|-----------|--------|----------|
| Masked OpenAI replace/remove | **Working** | `backgroundUrl` swapped from API |
| Unmasked replace/remove | **Fake** | `applyEditorLayerOperation` metadata |
| Background segment | **Partial** | Mask on layer; bg image often same |
| Background blur/sky | **Broken** | No mask on background |
| Cutout PNG creation | **Partial** | Server URL; not on canvas |
| Brand kit / library composite | **Fake** | `importedLayers` not rendered |
| Placement overlay | **Partial** | Visible on canvas; absent from export |
| Poster template | **Fake** | Settings until export |
| GIF export | **Partial** | Static single frame |
| Translate | **Broken** | Toast-only plan step |

---

## Project Lifecycle Audit

| Capability | Status | Evidence |
|------------|--------|----------|
| New project | Works | `createEditorDocumentFromUpload` + vision |
| Open (`?session=`) | Works | `loadEditorCanvasDocument` from localStorage |
| Recent (8 listed) | Works | `listRecentEditorDocuments` |
| Save draft (toolbar) | **Misleading** | localStorage only |
| Save to library | Works via Review | `persistEditorSave` → `/api/editor/save` |
| Save as modes | Works | Review panel modes |
| Duplicate project | **Missing** | No session clone |
| Delete project | **Missing** | No `deleteEditorCanvasDocument` |
| Archive / recover | **Missing** | No editor UI |
| Unsaved warning on back | **Missing** | `editor-product-page` back has no confirm |
| `beforeunload` | **Missing** | Not in editor components |

Storage key: `hc-editor-canvas-sessions-v1` (`editor-canvas-session.ts`).

---

## Library Audit

| Step | Cutout | Poster/print | GIF | Motion-ready |
|------|--------|----------------|-----|--------------|
| Create | SAM2 + cutout URL | Export hub | Quick motion panel | Export hub |
| Save to server | `persistCutoutToLibrary` (cutout mode) | Review save `print_export` only | Review `gif_asset` | Review `motion_ready_export` |
| Preview in editor | Layer metadata | Review bg image | Download file | Manifest JSON |
| Search | **No** | **No** | **No** | **No** |
| Reuse | Drag panel / start library pick | Derivation sources | Same | Handoff in semantic record |
| Delete | Studio lifecycle only | Same | Same | Same |

**Gap:** `appendLibraryExport` after export hub is **session metadata only** — not a server library entity unless user review-saves.

**Gap:** `listLocalEditorSavedRecords` fallback exists but **no UI** to recover failed server saves.

---

## Studio Pipeline Audit

```
Editor (localStorage)
  ↓ persistEditorSave (Review / cutout)
Library (Prisma + semantic record + editorStudioHandoff)
  ↓ fetchAssetDerivationSources
Editor reuse / compose mode
  ↓ ?editorSession= (local session)
Studio (banner only — EditorStudioEntryBanner)
  ↓ manual storyboard
Studio handoff API
  ↓ /animate/instant/import?storyboardId=
Motion (works on Studio path)
  ↓ render
Publish (buildMotionRenderNextActions)
```

| Handoff | Survives | Lost | Manual work |
|---------|----------|------|-------------|
| Editor → Library | Image URL, semantic record, handoff JSON | Undo stacks, in-session-only exports | Open Review or cutout save |
| Editor → Studio | Local session if same browser | Storyboard, scenes | Create storyboard |
| Editor → Motion | **Nothing auto** (URL only) | Wizard state | Re-import images |
| Library → Editor | `referenceImageUrl` | Editor session context | Pick from list |
| Studio → Motion | Full `MotionHandoffPayload` | Sanitized fields | Complete storyboard |

---

## UX Complexity Audit

| Category | Examples |
|----------|----------|
| **Essential** | Magic bar, contextual actions, object chips, canvas, review save |
| **Useful** | Selection tools (SAM2/lasso), export hub, handoff score (motion mode), dual composer |
| **Advanced** | Assistant sidebar, full layer tree, body designer, workflow step label |
| **Developer** | Properties panel, placement QA, composition graph, SAM2 status |
| **Redundant** | Floating toolbar (`visible={false}`) |
| **Remove candidate** | `EditorQuickActionBar` (never mounted) |

**Goal for normal UI:** Hide developer/advanced panels behind a single “Advanced” toggle; remove dead components; consolidate magic bar + assistant sidebar.

---

## Canva Test

**Persona:** First-time user, 30 seconds.

| Task | Completable? | Where lost |
|------|--------------|------------|
| Upload image | Yes | Start screen simplified |
| Replace logo | **No** | Must select object (approximate bbox), refine mask, open replace panel, Apply |
| Remove background | **Partial** | Segmentation may work; canvas may not show result as expected |
| Save | **Unclear** | Toolbar draft ≠ library; Review not obvious |
| Export | **Partial** | File downloads but may not match composition |

**Score: 2/5** — upload and export partially work; core edit loop fails without mask literacy.

---

## Runway Test

| Task | Completable? | Break point |
|------|--------------|-------------|
| Upload | Yes | — |
| Select object | Partial | Template bboxes |
| Replace object | Partial | Mask + two-step replace |
| Create GIF | Partial | Static GIF only |
| Prepare Motion | Partial | Handoff metadata; no canvas truth |
| Export | Partial | Background-only file |

**Score: 2.5/5** — motion/GIF marketing exceeds encoder reality.

---

## HomeCheff Vision Test

| Step | Possible today? | Blocker |
|------|-----------------|---------|
| Upload image | Yes | — |
| Fix image (replace/remove/bg) | Partial | Masks + WYSIWYG |
| Create cutout | Partial | SAM2 env; not visible on canvas |
| Store in Library | Partial | Review path or cutout auto-save |
| Reuse in Studio | Partial | Library yes; Studio import manual |
| Animate in Motion | **No** (from Editor) | Bootstrap not wired |
| Publish | Partial | Only after Motion render |

**Verdict:** End-to-end HomeCheff vision is **not achievable in one continuous flow** from Editor today. Closest path: Editor → Review save → Library → manual Studio storyboard → Motion import.

---

## Top 25 Blockers

| # | Blocker | Impact | Effort | Sprint |
|---|---------|--------|--------|--------|
| 1 | Canvas does not composite importedLayers/cutouts | critical | high | S1 WYSIWYG compositor |
| 2 | Template/estimated object bounds | critical | high | S1 selection truth |
| 3 | Unmasked replace/remove = metadata only | critical | medium | S1 mask gate UX |
| 4 | Export uses backgroundUrl only | critical | high | S1 export compositor |
| 5 | Sessions localStorage-only | critical | high | S1 project persistence |
| 6 | Toolbar draft ≠ server save | high | low | S1 honest save |
| 7 | Motion page ignores editorSession | high | medium | S2 Motion wire-up |
| 8 | Studio no session import | high | high | S2 Studio import |
| 9 | Background blur broken | high | medium | S1 segment-first |
| 10 | Magic edit two-step + unwired post-upload | high | low | S1 flow polish |
| 11 | GIF not animated | high | medium | S2 hide or implement |
| 12 | Cutout not visible on canvas | high | medium | S1 cutout layer |
| 13 | No delete/unsaved warning | medium | low | S1 lifecycle |
| 14 | Export hub ≠ library entity | medium | medium | S2 export persist |
| 15 | Duplicate invisible | medium | low | S1 feedback |
| 16 | Translate toast-only | medium | medium | S3 hide or build |
| 17 | Face selection template-only | medium | high | S3 face detect |
| 18 | SAM2/rembg 503 without env | medium | low | S1 disable + explain |
| 19 | No library search in editor | medium | medium | S2 search |
| 20 | Failed save fallback UI missing | medium | low | S2 recover UI |
| 21 | Poster preset no preview | medium | low | S1 preset preview |
| 22 | Floating toolbar dead | low | low | S1 remove |
| 23 | QuickActionBar unmounted | low | low | S1 remove |
| 24 | Duplicate AI entry points | low | low | S2 consolidate |
| 25 | Motion manifest not ZIP | medium | medium | S2 package format |

Full list: `TOP_25_BLOCKERS` in `editor-final-product-audit.ts`.

---

## Final Roadmap

### Phase 1 — Must fix before production

**No new AI features. Complete existing product.**

1. **WYSIWYG canvas compositor** — render `importedLayers`, cutouts, placements on preview and export.
2. **Honest selection UX** — “Refine selection” required before replace/remove; show approximate state clearly.
3. **Server-backed projects** — sync sessions or explicit “saved to cloud” via toolbar.
4. **Export = canvas** — single compositor used by preview and `render-editor-export.ts`.
5. **Wire Motion bootstrap** — consume `editorSession` / `editorAsset` on instant page.
6. **Remove or disable** — blur/sky/translate/GIF until real; dead toolbars.
7. **Lifecycle hygiene** — unsaved warning, delete session, honest Save Draft label.

### Phase 2 — Should fix before scale

1. Studio import from editor session / library asset (not banner-only).
2. Export → automatic library entity (not just `libraryExports` metadata).
3. Library search in editor pickers.
4. Failed server save recovery UI.
5. Animated GIF or rename to “static preview”.
6. Motion-ready ZIP with cutouts + masks.

### Phase 3 — Future improvements (existing scope only)

1. Face/part geometry from detection (not `PART_BOUNDS` templates).
2. Full project duplicate / archive.
3. Consolidate assistant sidebar into magic bar.
4. True PDF print pipeline.
5. Multi-frame GIF encoder.

---

## Tests / Build Status

Run before release:

```bash
npm run lint
npm run build
npm run test
```

Audit tests: `src/lib/editor-final-product-audit.test.ts`.

---

## Why the Editor still feels unfinished

1. **Eyes lie** — canvas shows the original upload while state claims logos, cutouts, and duplicates exist.
2. **Tools assume masks** — replace/remove/blur need segmentation the UI does not require first.
3. **Save confusion** — three save concepts (toolbar draft, review library, export metadata) with different outcomes.
4. **Pipeline stops at links** — Studio/Motion URLs exist; consumers do not load editor data.
5. **Too much surface area** — advanced/developer panels visible alongside broken placeholder actions.

**What must be built next (not new AI):** one compositor, one save model, one selection truth, wire existing handoff helpers.
