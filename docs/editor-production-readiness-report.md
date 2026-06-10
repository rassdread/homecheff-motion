# Editor Production Readiness Report

**Audit date:** 2026-06-10  
**Scope:** Editor V1–V7 — verification only, no new features  
**Automated checks:** `src/lib/editor-production-readiness-audit.test.ts` (33 tests)

---

## Production Journey Audit

### Scenario A — Upload → select → replace → save draft → reopen → export

| Step | Screen / component | API | Storage | Result | Failure modes |
|------|-------------------|-----|---------|--------|---------------|
| Upload | `EditorStartScreen` → `uploadEditorSourceImage` | `POST /api/uploads/images` | Vercel Blob + `localStorage` session | **WORKING** | Auth gate; blob token missing (503) |
| Vision / detect | `runEditorVisionAndObjectDetection` | `/api/studio/asset-derivation/analyze`, `/api/editor/detect` | Layers on document | **PARTIAL** | Vision fail → editor opens without layers |
| Select object | `EditorHumanObjectList` / canvas click | — | React state | **WORKING** | Empty if detection failed |
| Replace | `runMaskedEdit` → `executeEditorMaskedReplaceApi` | `POST /api/editor/edit/replace` | New `backgroundUrl` on blob | **PARTIAL** | Requires `selectionShape.maskUrl`; without mask → metadata-only patch, no pixels |
| Save draft | `EditorToolbar` → `handleSaveDraft` | **None** | `localStorage` (`hc-editor-canvas-sessions-v1`) | **PARTIAL** | Not synced to server; lost on new device |
| Reopen | `?session=` → `loadEditorCanvasDocument` | — | `localStorage` | **PARTIAL** | URL without matching storage → lost session |
| Export image | `handleDownload` → `exportEditorCanvasWithPlacements` | — | Client download | **PARTIAL** | Downloads background or placement overlay only — not full masked composite |

**Verdict:** Journey completes locally but export is not WYSIWYG; toolbar draft ≠ server library draft.

---

### Scenario B — Upload → remove background → cutout → Library → reuse

| Step | Screen / component | API | Storage | Result | Failure modes |
|------|-------------------|-----|---------|--------|---------------|
| Remove background | `handleRemoveBackground` | `POST /api/editor/segment` | Mask/cutout on blob | **PARTIAL** | Needs selected layer; segmentation 500 |
| Cutout | `handleOneClickCutout` | `POST /api/editor/segment/click` (SAM2) | `cutoutAssets`, `libraryExports` on document | **PARTIAL** | SAM2 503; missing `cutoutUrl` |
| Save to Library | UI: `editor.v6.cutout.saved` | **No `persistEditorSave`** | `localStorage` metadata only | **BROKEN (labeling)** | Message implies Library DB save; only local `appendLibraryExport` |
| Reuse | `EditorLibraryDragPanel` (compose mode) | `GET /api/studio/asset-derivation/sources` | `importedLayers` | **PARTIAL** | Cutouts not in DB won't appear; compose workspace required |

**Verdict:** Cutout pipeline works in-session; Library persistence is the broken link.

---

### Scenario C — Upload → motion-ready → Studio → Motion → render

| Step | Screen / component | API | Storage | Result | Failure modes |
|------|-------------------|-----|---------|--------|---------------|
| Motion-ready | Export hub / V7 `motion_ready` step | `POST /api/editor/export/motion-ready` | JSON bundle + doc metadata | **PARTIAL** | Metadata only — no downloadable asset |
| Handoff model | `attachStudioMotionHandoff` on save | — | `document.studioMotionHandoff` in localStorage | **PARTIAL** | Not persisted to Prisma on library save |
| Studio entry | `buildEditorSaveNextActions` | — | Link `/studio` | **BROKEN (wire)** | No session/asset/deep link |
| Studio → Motion | Manual storyboard | `GET /api/studio/storyboards/{id}/handoff` | Prisma | **WORKING** (Studio path) | Requires user-built storyboard |
| Motion import | `/animate/instant/import?storyboardId=` | Handoff API | Motion wizard | **WORKING** (Motion path) | No `storyboardId` from Editor |
| Render | Instant premium pipeline | Provider APIs | Blob + DB | **WORKING** (downstream) | Credits, provider errors |

**Verdict:** Editor → Studio → Motion is **not a continuous pipeline**. Path is Editor → (manual) library save → Studio storyboard → Motion.

---

### Scenario D — Upload → GIF → export GIF

| Step | Screen / component | API | Storage | Result | Failure modes |
|------|-------------------|-----|---------|--------|---------------|
| GIF mode | Workspace `quick_motion` | — | `quickMotionConfig` | **WORKING** (UI) | — |
| Preview | `EditorMotionPreviewBar` / CSS overlay | — | `productivityState` | **PARTIAL** | Visual only |
| Export GIF | `EditorQuickMotionPanel` | `POST /api/editor/export/quick-motion` | Job descriptor | **PLACEHOLDER** | `status: "pending_server"` — **no encoder** |

**Verdict:** GIF export does not produce a file.

---

### Scenario E — Upload → poster → print export

| Step | Screen / component | API | Storage | Result | Failure modes |
|------|-------------------|-----|---------|--------|---------------|
| Poster template | `EditorPosterBuilderPanel` | — | `exportSettings.print`, `posterTemplate` | **WORKING** (config) | Settings only |
| Print export | `EditorExportHubPanel` | `POST /api/editor/export/print` | JSON bundle | **PARTIAL** | Correct dimensions (e.g. A4 ≈ 2480×3508 @ 300dpi) but **no PNG/PDF bytes** |
| Upscale | `assessPosterUpscaleNeeds` | — | Warning in UI | **PARTIAL** | Advisory only; no upscale job |

**Verdict:** Poster layout configuration works; print file generation does not.

---

## AI Command Bar Audit

**26 prompts tested** in `editor-production-readiness-audit.test.ts`.

| Prompt | Intent detected | Plan generated | Preview | Execution | Result saved |
|--------|----------------|----------------|---------|-----------|--------------|
| Give him a black jacket | ✅ `magic_replace` | ✅ | ✅ | ⚠️ needs mask+OpenAI | ⚠️ localStorage |
| Make the background white | ❌ fallback | ✅ fallback | ✅ | ⚠️ generic replace | ⚠️ |
| Replace globe with football | ✅ | ✅ | ✅ | ⚠️ needs mask | ⚠️ |
| Add logo | ✅ `logo_placement` | ✅ | ✅ | ✅ opens placement UI | — |
| Add a HomeCheff logo | ❌ fallback | ✅ | ✅ | ⚠️ | ⚠️ |
| Create restaurant poster | ✅ skill | ✅ 5 steps | ✅ | ⚠️ config only | metadata |
| Instagram story | ✅ `social_preset` | ✅ | ✅ | ⚠️ config only | metadata |
| Make this motion ready | ✅ | ✅ | ✅ | ⚠️ export mode switch | metadata |
| Create a GIF | ✅ | ✅ | ✅ | ❌ `pending_server` | ❌ |
| Translate to Dutch | ✅ | ✅ | ✅ | ❌ toast only | ❌ |
| Translate to English | ❌ fallback | ✅ | ✅ | ❌ | ❌ |
| Remove background | ✅ | ✅ | ✅ | ⚠️ segmentation | ⚠️ |
| Remove people in background | ✅ | ✅ | ✅ | ⚠️ masked delete | ⚠️ |
| Motion-ready combo prompt | ✅ multi | ✅ | ✅ | ⚠️ partial chain | ⚠️ |
| Background cleanup skill | ✅ (exact term) | ✅ | ✅ | ⚠️ blur broken | ⚠️ |
| Publish to social | ✅ | ✅ | ✅ | ⚠️ preset only | metadata |
| 5-scene story | ✅ | ✅ | ✅ | ⚠️ `window.open` | — |
| Print ready | ✅ | ✅ | ✅ | ⚠️ metadata bundle | metadata |

**Summary:** Intent detection ~85% on tested prompts. Execution saves real pixels only for masked OpenAI edits. Export/GIF/translate steps are UI or metadata only.

**Known gaps:** `"Add a HomeCheff logo"` (needs `"add logo"` substring), `"Make the background white"`, `"Clean up the background"` (skill term mismatch).

---

## Real Functionality Audit

| Tool | Status | User expects | Actually happens |
|------|--------|--------------|------------------|
| **Replace** | PARTIAL | Pixel swap on object | OpenAI masked edit if `maskUrl` exists; else metadata patch only |
| **Remove** | PARTIAL | Object gone, bg filled | AI inpaint with mask; else layer hidden only |
| **Animate** | PARTIAL | Motion preview / video | CSS keyframe overlay only |
| **Duplicate** | PARTIAL | Visual copy | New semantic layer + offset; canvas shows single `backgroundUrl` |
| **Cut out** | PARTIAL | Transparent PNG in Library | SAM2 cutout to blob + local `libraryExports`; not server Library |
| **Background remove** | PARTIAL | Transparent / clean bg | Segmentation API + mask on layer |
| **Background blur** | BROKEN | Blurred background | `runMaskedEdit` aborts — background layer has no mask |
| **Sky replacement** | BROKEN | New sky | Same mask gate; only in advanced panel |
| **Poster export** | UI ONLY | Downloadable poster | Template + dimension metadata; no render |
| **Motion ready** | PARTIAL | Studio-ready package | JSON handoff bundle; no file download |
| **GIF export** | PLACEHOLDER | Downloadable GIF | `pending_server` — no encoder |
| **Library drag** | PARTIAL | Asset on canvas | `importedLayers` updated; main canvas may not render them |
| **Brand kit insert** | PARTIAL | Logo on image | `dropLibraryAssetOnCanvas` — compose mode |
| **Translate text** | UI ONLY | Translated pixels | Toast message only |
| **Alignment** | WORKING | Center/distribute layers | Transform math on document |
| **Save draft (toolbar)** | PARTIAL | Cloud draft | localStorage only |
| **Save to library (review)** | WORKING | Server asset | `POST /api/editor/save` |
| **Undo/redo** | WORKING | History | `nonDestructive` stack in localStorage |

Readiness registry (`editor-ux-cleanup.ts`) marks clothing/expression/expand as `placeholder`.

---

## Studio Handoff Audit

### Editor → Studio

| Field | Preserved in handoff JSON | Persisted to Prisma on save |
|-------|--------------------------|----------------------------|
| Masks | ✅ in `cutoutAssets` / layer shapes | ❌ |
| Cutouts | ✅ `cutoutAssets` | ❌ (URLs not in semantic record) |
| Imported layers | ✅ in bundle | ❌ |
| Motion metadata | ✅ `motionPreparations`, `animationProfiles` | ❌ |
| Object names | ✅ hierarchies + detected objects | ⚠️ summary only |
| Animation profiles | ✅ | ❌ |

`buildStudioMotionHandoff` runs on every `saveEditorCanvasDocument`. V7 studio bridge routes keywords to export mode or `window.open("/studio/storyboards/new")` — **not** handoff payload import.

### Studio → Motion

| Field | Preserved |
|-------|-----------|
| Assets | ✅ via `createMotionHandoffPayload` |
| Hierarchy | ✅ in `studioHandoffJson` |
| Scene placement | ✅ storyboard scenes |
| References | ✅ storyboardId required |

**Gap:** Editor does not pass `storyboardId` or handoff JSON to Motion.

---

## Persistence Audit

| Field | Survives refresh (same browser) | Survives server save |
|-------|--------------------------------|---------------------|
| Edits / `backgroundUrl` | ✅ localStorage | ⚠️ reference image only |
| Cutouts | ✅ if blob URLs valid | ❌ |
| Imported layers | ✅ | ❌ |
| `libraryExports` | ✅ (metadata, no URLs) | ❌ |
| Assistant history | ✅ | ❌ |
| Motion settings | ✅ | ❌ |
| Undo stack | ✅ | ❌ |
| `studioMotionHandoff` | ✅ localStorage | ❌ |

**Storage:** `hc-editor-canvas-sessions-v1` (localStorage). No server session API.

**Save modes** (`cutout`, `gif_asset`, `motion_ready_export`, `print_export`) defined in `saveModeForCategory` but **never called** from UI.

---

## Export Audit

| Mode | Generated file | Dimensions | Downloadable | Opens correctly |
|------|---------------|------------|--------------|-----------------|
| PNG/JPG/WEBP (production) | ❌ JSON bundle | 1600×900 default | ❌ | — |
| Motion bundle | ❌ JSON | — | ❌ | — |
| Print A4 | ❌ JSON | ~2480×3508 ✅ | ❌ | — |
| Print A3/A2/A1 | ❌ JSON | Correct mm→px ✅ | ❌ | — |
| Instagram 1080×1080 | ❌ preset config | ✅ | ❌ | — |
| Instagram Story | ❌ preset config | 1080×1920 ✅ | ❌ | — |
| TikTok / YouTube / etc. | ❌ preset config | ✅ per spec | ❌ | — |
| GIF | ❌ `pending_server` | 512×512 default | ❌ | — |
| Client download | ⚠️ background only | Source resolution | ✅ | ⚠️ not composite |

---

## Library Audit

| Asset type | Stored in session | Stored in server Library | Reusable |
|------------|----------------|-------------------------|----------|
| Cutouts | ✅ `cutoutAssets` + metadata | ❌ | ⚠️ compose drag only if server saved |
| Edited images | ✅ `backgroundUrl` | ⚠️ on review save | ✅ derivation sources |
| GIFs | ❌ | ❌ | ❌ |
| Posters | metadata only | ❌ | ❌ |
| Exports | `libraryExports` labels | ❌ | ❌ |
| Motion-ready | metadata only | ❌ | ❌ |

`appendLibraryExport` never sets `url`. Assistant sidebar shows last 3 export labels only.

---

## Performance Audit

| Operation | Rating | Notes |
|-----------|--------|-------|
| Upload | **Acceptable** | Blob client upload; depends on image size |
| Detection | **Acceptable** | ONNX/heuristic; async on upload |
| Segmentation (SAM2) | **Slow–Acceptable** | Remote SAM2; 503 when unavailable |
| Replace (OpenAI) | **Slow** | Mask fetch + OpenAI edit + blob upload |
| Save (local) | **Fast** | localStorage JSON |
| Save (server) | **Acceptable** | Single image upload |
| Export APIs | **Fast** | Returns JSON instantly — no render |
| GIF export | **Broken** | No encoder |

---

## Error Handling Audit

| Failure | User feedback | Recovery path |
|---------|--------------|---------------|
| SAM2 unavailable | `editor.sam2.statusUnavailableDev` + 503 message | Fallbacks listed: lasso, rembg, approximate box |
| SAM2 click fail | Error message in `saveMessage` | Manual selection tools shown |
| OpenAI edit fail | `api.error` or `editor.visionV3.editFailed` | No auto-retry button |
| No mask for edit | Plan message, early return | User must refine selection |
| Storage upload fail | 502 STORAGE on segment | Partial: mask may succeed, cutout silent fail |
| Export queued | Success toast for metadata | Misleading — no file coming |

**Gaps:** No universal retry button; GIF/export success messages imply completion; cutout storage failure can be silent.

---

## Production Scorecard

| Category | Score | Rationale |
|----------|-------|-----------|
| Editor Core | **6/10** | Upload, select, local edit session work; composite export weak |
| AI Assistant | **5/10** | Intent + plans solid; execution chain incomplete |
| Selection | **7/10** | Vision layers, SAM2, lasso available |
| Segmentation | **6/10** | Works when SAM2 up; dependency heavy |
| Library | **4/10** | Review save works; cutout/export modes unwired |
| Export | **3/10** | Metadata bundles only; no file generation |
| Studio Bridge | **3/10** | Generic links; handoff JSON not persisted |
| Motion Bridge | **5/10** | Motion path works from storyboard; not from Editor |
| Persistence | **5/10** | localStorage reliable locally; no cloud session |
| Performance | **6/10** | Acceptable except AI ops |
| Reliability | **5/10** | Graceful SAM2 degradation; silent export gaps |

**Overall production readiness: 4.5 / 10** — strong prototype, not production-complete pipeline.

### Top 10 blockers before production

1. **Export routes return JSON only** — no PNG/PDF/GIF bytes  
2. **GIF encoder missing** (`pending_server`)  
3. **Cutout “saved to Library” is misleading** — not `persistEditorSave`  
4. **Toolbar draft is localStorage-only**  
5. **Editor → Studio → Motion discontinuous** — no handoff wire  
6. **`studioMotionHandoff` not in Prisma**  
7. **Replace/remove require mask** — no mask = no pixels  
8. **Background blur/sky broken** without background mask  
9. **Client download not WYSIWYG** — placements/masks not baked  
10. **`importedLayers` not rendered** on main canvas preview  

### Top 10 improvements after production

1. Server-side canvas compositor for true WYSIWYG export  
2. Wire `saveModeForCategory` after cutout/GIF/export success  
3. Cloud session sync API (replace localStorage-only)  
4. Editor deep link to Studio with `assetId` + handoff JSON  
5. Expand intent patterns (“Add a HomeCheff logo”, “make background white”)  
6. Retry buttons on all AI operations  
7. Real translate-text pipeline  
8. Progress indicators for slow OpenAI/SAM2 ops  
9. Library browse/re-import from `libraryExports`  
10. Honest copy for queued vs completed exports  

---

## Tests / Build Status

```
npm run lint   → pass (0 errors)
npm run build  → pass
npm run test   → pass (includes editor-production-readiness-audit.test.ts)
```

Automated audit: **33 tests** documenting intent coverage, export stubs, dimension specs, and known gaps.
