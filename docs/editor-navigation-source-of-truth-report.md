# Editor Navigation Source Of Truth Report

**Date:** 2026-06-10  
**Scope:** Audit-only — routes, entry points, duplicates, legacy redirects. No UI redesign.

---

## Editor Route Inventory

| Route | Component | Purpose | Used? | Legacy? | Production? | Hidden? |
|-------|-----------|---------|-------|---------|-------------|---------|
| `/editor` | `EditorProductPage` | Start screen + canvas workspace | **Yes** | No | **Official Editor** | Public nav |
| `/editor?session={id}` | `EditorCanvasWorkspace` | Single production editor shell | **Yes** | No | **Yes** | — |
| `/studio` | `StudioRootPage` | Studio home **or** workspace when `storyboardId` set | Yes | No | **Official Studio hub** | Public |
| `/studio?storyboardId={id}` | `StudioWorkspaceShell` | Storyboard workspace (Director, scenes) | Yes | No | **Yes** | — |
| `/studio?editorSession={id}` | `EditorStudioEntryBanner` + dashboard | Editor handoff banner (localStorage) | Yes | Partial | Yes | Query-only |
| `/studio/workspace` | Redirect → `/studio` | Old workspace URL | Redirect | **Legacy** | No | — |
| `/studio/my-studio` | Redirect → `/studio` | Old hub name | Redirect | **Legacy** | No | — |
| `/studio/advanced` | Redirect → `/studio` | Comment: consolidated into home | Redirect | **Legacy** | No | — |
| `/studio/storyboards/new` | `StudioProductionBriefFlow` | New storyboard from brief (+ editor seed) | Yes | No | **Official Studio create** | Nav |
| `/studio/storyboards/[id]` | Redirect → `studioWorkspaceHref` | Canonical workspace URL | Redirect | Alias | Yes | — |
| `/studio/storyboards/[id]/classic` | `StudioStoryboardEditor` | Classic storyboard editor | Rare | **Alternate** | Studio sub-product | Linked from workspace |
| `/studio/storyboards/[id]/edit` | Storyboard metadata form | Title/relationships edit | Yes | No | Admin/metadata | Studio nav |
| `/studio/storyboards/[id]/production` | `StudioProductionCenter` | Production tooling | Yes | No | Yes | Studio nav |
| `/studio/storyboards/[id]/movie-builder` | `StudioMovieBuilder` | Movie builder flow | Yes | No | Yes | Studio nav |
| `/studio/assets` (+ subpaths) | Asset library hub | Characters, props, uploads | Yes | No | **Official Library** | Nav |
| `/studio/assets/browse` | Asset browse | Library picker | Yes | No | Yes | — |
| `/studio/workspace` | Client redirect | Compatibility | Redirect | Legacy | No | — |
| `/animate` | `AnimatePage` | Multi-image transition animation (2+ images) | Yes | No | **Motion (classic)** | Nav |
| `/animate/[id]` | Animation project detail | Saved animation project | Yes | No | Yes | From `/animate` |
| `/animate/instant` | Instant Premium wizard | OCR / premium video pipeline | Yes | No | **Official Motion (suite)** | Nav + handoff |
| `/animate/instant/import` | Import helper | Redirects into instant flow | Yes | Bridge | Yes | — |
| `/animate/instant/progress` | Progress UI | Instant generation progress | Yes | No | Yes | Wizard step |
| `/animate/instant/success` | Success UI | Post-generation | Yes | No | Yes | Wizard step |
| `/publish` | `PublishProductPage` | Presentation / deliverables export | Yes | No | **Official Export** | Nav |
| `/library` | Redirect → `/studio/assets` | Suite alias | Redirect | Alias | Yes | Nav label |
| `/presentation` | Redirect → `/publish` | Suite alias | Redirect | Alias | Yes | — |
| `/create` | Redirect → `/maak` | Dutch “create” alias | Redirect | Alias | Yes | — |
| `/maak` | `MaakOrSuiteStartPage` | Universe home or legacy choice | Yes | Entry hub | Yes | Marketing |
| `/videos`, `/videos/[id]` | Video library / player | Instant Premium projects (not Editor) | Yes | Separate product | Yes | Nav |
| `/admin/ai-lab/replicate` | Replicate verification lab | Admin SAM3 testing | Admin | Internal | Admin only | Hidden |

**There is no `/editor/v5`, `/editor/v6`, or `/editor/v7` route.** V5/V6/V7 are internal module names (`editor-v6-*`, `editor-v7-*`, `editor-human-first`) inside the single `EditorCanvasWorkspace`.

---

## Entry Point Audit

| Entry point | Destination URL | Component | Production? | Legacy? | Expected? |
|-------------|-----------------|-----------|-------------|---------|-----------|
| Suite / Universe “Editor” planet | `/editor` | `EditorStartScreen` | Yes | No | **Yes** |
| Suite home card | `/editor` (auth-gated) | `EditorStartScreen` | Yes | No | Yes |
| Upload image on start screen | `/editor?session={newId}` | `EditorCanvasWorkspace` | Yes | No | **Yes** |
| Recent project (local) | `/editor?session={id}` | `EditorCanvasWorkspace` | Yes | No | Yes |
| Recent project (server `createEditorProject`) | Same after hydrate | `EditorProductPage` fetches API | Partial | No | Yes (needs auth) |
| Library source on start screen | `/editor?session={newId}` | Same workspace after `createEditorDocumentFromLibrarySource` | Yes | No | Yes |
| Post-upload mode picker | Same session, `workspaceMode` / `editorFlowMode` set | `EditorCanvasWorkspace` tabs | Yes | No | Yes |
| Asset intelligence “Use in Studio” | `/studio/storyboards/new?editorSession=` | `StudioProductionBriefFlow` | Yes | No | Yes |
| Asset intelligence “Animate in Motion” | `/animate/instant?editorSession=` | Instant wizard + bootstrap | Yes | No | Yes |
| Human action “add_to_studio” | `window.open(/studio/storyboards/new?editorSession=)` | New tab brief flow | Yes | No | Yes |
| Human action “use_in_motion” | `window.open(/animate/instant?editorSession=)` | New tab instant | Yes | No | Yes |
| V7 plan step `studio_story` | `window.open(/studio/storyboards/new)` **without** `editorSession` | Brief flow | Yes | **Gap** | **No** — loses handoff |
| Editor review “Open Studio” | Via `resultLibraryHref` / review panel | Mixed | Partial | — | Partial |
| `/library` nav | `/studio/assets` (redirect) | Asset hub | Yes | Alias | Yes |
| `/maak` / `/create` | Universe or `MaakChoicePage` | Marketing entry | Yes | No | Yes |
| Motion nav (suite definition) | `/animate/instant` | Instant wizard | Yes | No | **Yes** |
| Classic motion upload | `/animate` | Multi-image animator | Yes | Parallel product | Optional path |

---

## Source Of Truth Flow

**Intended suite flow (from `HOMECHEFF_PRODUCT_DEFINITIONS`):**

```
Upload / pick asset
    ↓
/editor  (EditorCanvasWorkspace — photo_edit | compose | quick_motion | export tabs)
    ↓
/studio?storyboardId=…  OR  /studio/storyboards/new?editorSession=…
    ↓
/animate/instant?editorSession=…  (Motion Instant Premium)
    ↓
/publish  (deliverables)
```

| Path type | Route pattern | Status |
|-----------|---------------|--------|
| **Official Editor** | `/editor?session=` + `EditorCanvasWorkspace` | **Single implementation** |
| **Official Studio workspace** | `/studio?storyboardId=` + `StudioWorkspaceShell` | Yes |
| **Official Motion (suite)** | `/animate/instant` + `editorSession` bootstrap | Yes |
| **Official Export** | `/publish` + Editor `export` tab (`EditorExportHubPanel`) | Dual entry (see duplicates) |
| **Alternative Motion** | `/animate` (multi-image, no editor session) | Parallel, not editor handoff |
| **Legacy Studio** | `/studio/storyboards/[id]/classic` | Still reachable |
| **Broken / weak handoff** | Studio/Motion read **localStorage only** via `resolveEditorStudioEntry` | Cross-device / empty tab risk |

---

## Duplicate Screen Audit

| Screen A | Screen B | Which survives? | Remove / redirect? |
|----------|----------|-----------------|-------------------|
| `EditorCanvasWorkspace` | None (no second editor page) | **A** | — |
| `EditorCanvasWorkspace` export tab | `PublishProductPage` | Both — different scope | Clarify labels; publish = suite deliverables |
| `AnimatePage` (`/animate`) | `Instant` (`/animate/instant`) | **Instant** for suite Motion href | Keep `/animate` for power users; nav should prefer instant |
| `StudioWorkspaceShell` | `StudioStoryboardEditor` (classic) | **Workspace shell** for production | Classic = legacy/advanced link only |
| `StudioHomeDashboard` | `/studio/my-studio` | Dashboard on `/studio` | **Removed** (redirect exists) |
| `StudioProductionBriefFlow` | Studio home “new storyboard” | Brief flow for editor handoff | Unify CTAs to always pass `editorSession` |
| `EditorReviewPanel` save | Toolbar “Save draft” | Both localStorage | Server save via review/API still partial |
| `EditorFloatingToolbar` | Contextual action bar | Toolbar **not mounted** (dead file) | Safe to archive |

---

## Routing Consistency Test

| Simulation | Lands in | Same as official Editor? |
|------------|----------|---------------------------|
| Upload image (start screen) | `/editor?session=` → `EditorCanvasWorkspace` | **Yes** |
| Open existing project (recent) | `/editor?session=` → same workspace | **Yes** |
| Open library asset (start screen) | New session → same workspace | **Yes** |
| Studio handoff (`editorSession` on `/studio`) | Banner only; workspace needs `storyboardId` | **Partial** — not editor |
| Motion handoff (`editorSession` on `/animate/instant`) | Instant wizard; bootstrap from localStorage | **Partial** — not editor, data coupling |
| Auto-mask on layer select | Same workspace, `/api/editor/segment/click` | **Yes** |
| Globe chip “Selecteer: globe” | Same workspace | **Yes** |

**Divergence:** No second Editor implementation. Divergence is **handoff targets** (Studio/Motion) and **V7 `studio_story` plan** missing `editorSession`.

---

## Feature Parity Audit

Only one Editor route exists. All features live in `EditorCanvasWorkspace` with `workspaceMode` tab gating (`editor-ux-v7-workspace.ts`).

| Route | Object chips | Asset intelligence | Replicate segmentation | Child layers | Motion readiness | Export hub | Save system | Project autosave |
|-------|--------------|-------------------|------------------------|--------------|------------------|------------|-------------|-------------------|
| `/editor?session=*` | Yes (`EditorHumanObjectList`) | Yes (`EditorAssetRecommendationsPanel`) | Yes (status + segment APIs) | Yes (`runPromptSubLayerSegmentation`) | Yes (handoff + quick_motion tab) | Yes (export tab) | localStorage + `createEditorProject` on open | Server fetch on load; toolbar draft local |

**Sub-modes (tabs), not separate routes:**

| `workspaceMode` | Extra panels |
|-----------------|--------------|
| `photo_edit` | Object properties, segmentation, selection tools |
| `compose` | Dual composer, library drag, brand kit |
| `quick_motion` | Quick GIF / motion preview |
| `export` | Export hub, alignment, poster/social |

`editorFlowMode === "motion_prepare"` adds motion-prep panels on any tab.

**Parity score:** **1 route = 100%** — inconsistency is UX/navigation, not missing route forks.

---

## Legacy Detection

| Item | Safe to remove? | Referenced? | Still reachable? |
|------|-----------------|-------------|------------------|
| `/studio/advanced` | Already redirect | — | No |
| `/studio/my-studio` | Already redirect | — | No |
| `/studio/workspace` | Redirect only | Old links | Via URL |
| `EditorFloatingToolbar` | **Yes** (unused) | Test asserts not in workspace | No |
| `/studio/storyboards/[id]/classic` | Archive later | `studioClassicEditorHref` | Yes (workspace link) |
| `/animate` vs `/animate/instant` | Do not remove | Both in nav/product defs | Both |
| V5/V6/V7 as routes | N/A — never existed | Internal libs only | — |
| `editorFlowMode` vs `workspaceMode` | Do not remove yet | Both used | Dual gating (documented) |

---

## User Journey Validation

**Globe Man → Edit → Studio → Motion → Export (intended production):**

| Step | Expected route | Actual | OK? |
|------|----------------|--------|-----|
| Create new project | `/editor` upload | `/editor?session=` | Yes |
| Edit / segment globe | Same workspace | Same | Yes |
| Save | localStorage + optional server project | `saveEditorCanvasDocumentWithStatus` + `createEditorProject` on first open | Partial |
| Open Studio | `/studio/storyboards/new?editorSession=` | Links pass param | Yes **if localStorage has session** |
| Open Motion | `/animate/instant?editorSession=` | Bootstrap from localStorage | Yes **if localStorage has session** |
| Export | Editor export tab or `/publish` | Both available | Yes |

**Critical gap:** `resolveEditorStudioEntry` / `resolveEditorMotionBootstrap` do **not** call `fetchEditorProject`. New tab or second device → handoff banner empty, Motion bootstrap null, even with valid `editorSession` query param.

---

## Cleanup Plan

### Critical

1. **Server-backed handoff** — `resolveEditorStudioEntry` should fetch `/api/editor/projects/{id}` when localStorage miss (same as `EditorProductPage` hydrate).
2. **Fix V7 `studio_story` step** — pass `editorSession` in `window.open` URL (match human actions).
3. **Document single Editor route** in suite nav help — no implied V6/V7 URLs.

### High

4. Redirect or remove **classic** storyboard editor link unless explicitly “Advanced classic mode”.
5. Unify Motion entry in nav: suite `motion` href is `/animate/instant` but some users land on `/animate` — add banner cross-link.
6. Wire toolbar “Save draft” to `/api/editor/save` or remove misleading label (per prior audits).

### Medium

7. Archive `editor-floating-toolbar.tsx` (dead).
8. Consolidate export UX: Editor export tab vs `/publish` — cross-links only.
9. `/studio?editorSession=` without `storyboardId` — consider auto-forward to `storyboards/new?editorSession=` when banner shown.

### Low

10. Remove stale comments referencing “Editor V5” in docs outside this report.
11. `editorFlowMode` vs `workspaceMode` — long-term merge to tab-only gating.

---

## Final Source Of Truth

| Product | **ONE official route** | Classification of others |
|---------|------------------------|---------------------------|
| **Editor** | `/editor` + `/editor?session={uuid}` → `EditorCanvasWorkspace` | V6/V7/Human-first = **internal modules only** |
| **Studio** | `/studio?storyboardId={id}` → `StudioWorkspaceShell` | `/studio/storyboards/[id]/classic` = **legacy alternate**; `/studio/storyboards/new` = **create entry** |
| **Motion** | `/animate/instant` (suite definition) | `/animate` = **parallel classic animator**; `/videos/*` = **instant premium library** |
| **Export** | `/publish` (suite) + Editor `workspaceMode: "export"` tab | Editor review download = **in-session export** |

Everything else:

| Class | Examples |
|-------|----------|
| **Legacy** | `/studio/advanced`, `/studio/my-studio`, `/studio/workspace`, classic storyboard editor |
| **Admin** | `/admin/*`, Replicate lab |
| **Experimental** | Director v2 panels, movie-builder |
| **Internal** | API routes `/api/editor/*`, localStorage session store |

---

## Tests / Build Status

See commit validation output. Contract tests: `src/lib/editor-navigation-source-of-truth-audit.test.ts`.
