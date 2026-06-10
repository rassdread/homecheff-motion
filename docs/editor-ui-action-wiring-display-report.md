# Editor UI Action Wiring & Display Report

## Open Photo Default State

**Visible (visual mode, `photo_edit` tab):**

| UI element | Condition |
|------------|-----------|
| Canvas + background image | Always |
| 4 workspace mode tabs | Always |
| `EditorHumanObjectList` chips (objects + background) | After detection bootstrap |
| `EditorMagicEditBar` | Always (V7 command plan) |
| `EditorAssetRecommendationsPanel` | When `document.assetProfile` exists |
| `EditorContextualActionBar` (5 no-selection actions) | No layer selected |
| `EditorAssistantSidebar` | Collapsed by default |
| Save message banner | When `saveMessage` set |
| Detection bootstrap hint | When `detectionMeta.userMessageKey` |

**Hidden by default:**

| UI element | Reason |
|----------|--------|
| Object-specific panels (replace, selection tools) | No selection / wrong tab |
| `EditorSelectionVerificationPanel` | Admin only |
| Provider status line | Admin only |
| `EditorClickSegmentPrompt` | Until canvas click |
| `EditorObjectActionMenu` | Until layer selected |
| Advanced 3-column layout | `uiMode === "visual"` |
| `EditorPlacementQaPanel` | Advanced + admin + AI analysis |
| Composition graph `<pre>` | Advanced + admin AI toggle |

**Moved / clarified:**

- Default UI is **visual** (`defaultEditorUiMode()` → `"visual"`).
- **Geavanceerd** toggle exposes layer tree + properties (power users).

## Mode Gating Audit

Gating now uses **active workspace tab** as source of truth (`editor-ux-v7-workspace.ts`).

| Tab (NL) | `workspaceMode` | Panels shown |
|----------|-----------------|--------------|
| Foto bewerken | `photo_edit` | Object panels: magic replace, selection tools, background tools, SAM2 refine |
| Afbeeldingen combineren | `compose` | Dual composer, library drag, brand kit, add source |
| GIF maken | `quick_motion` | `EditorQuickMotionPanel`, motion preview bar |
| Exporteren | `export` | Export hub, poster, social kit, alignment, handoff score |

**Start-screen flow extras** (`editorFlowMode`, unchanged):

| Start choice | Extra panels (any tab) |
|--------------|----------------------|
| Motion voorbereiden | `EditorHandoffScorePanel`, motion preview bar |

**Fix:** Compose / export / GIF panels no longer require matching `editorFlowMode` — switching tabs always shows the correct tools.

## Object Selection State Audit

| Selection | Chip | Outline | Toolbar | Hidden actions |
|-----------|------|---------|---------|----------------|
| Background | Background chip | Amber ghost / green if precise | Background replace/remove/expand | cutout, replace object |
| Parent (approximate) | Globe Man chip | Dashed bbox | Refine, cutout, duplicate (no replace until mask) | replace until mask |
| Precise child (globe) | Globe chip visible | Green mask contour | Replace, remove, cutout, duplicate | — |
| Imported layer | In compositor / placements | Placement handles | Move/resize on canvas | — |
| Text / logo | Chip by label | Contour or bbox | Refine-first; replace when masked | resize/move hidden |
| Cutout | Layer with `cutoutUrl` | Green contour | Same as masked object | — |

Mask gate blocks replace/delete on approximate layers → `EditorMaskGateDialog` with refine/lasso.

## Action Button Wiring Audit

### No selection (`EditorContextualActionBar`)

| Action | Handler | Status |
|--------|---------|--------|
| Foto bewerken | `setWorkspaceMode("photo_edit")` | WORKING |
| Object toevoegen | `setWorkspaceMode("compose")` | WORKING |
| Achtergrond | `selectLayer(background)` | WORKING |
| GIF | `setWorkspaceMode("quick_motion")` | WORKING |
| Exporteren | `setWorkspaceMode("export")` | WORKING |

### Object actions (masked globe child)

| Action | Handler | Status |
|--------|---------|--------|
| Replace | mask gate → `EditorMagicReplacePanel` | WORKING |
| Remove | `handleOperation("delete")` | WORKING |
| Cutout | `handleOneClickCutout` | WORKING |
| Duplicate | `handleOperation("duplicate")` | WORKING |
| Refine | `handleStartPreciseSelect` | WORKING |
| Resize | hint toast only | **HIDDEN** (fix) |
| Move | hint toast only | **HIDDEN** (fix) |
| Animate | motion preview | HIDDEN |
| Background blur | — | HIDDEN |

### Removed dead UI

| Component | Status |
|-----------|--------|
| `EditorFloatingToolbar` | **REMOVED** (`visible={false}` dead code) |

### Admin / dev

| Component | Gating |
|-----------|--------|
| `EditorSelectionVerificationPanel` | `isAdmin` |
| AI Analysis toggle | `editorAdminCanShowAiAnalysis` |
| `EditorPlacementQaPanel` | advanced + admin + `showAiAnalysis` |
| `EditorAiSuggestions` | admin AI toggle |

## Core User Flow Test

| Step | Expected | Code path |
|------|----------|-----------|
| Upload Globe Man | Bootstrap layers + chips | `runEditorVisionAndObjectDetection` |
| Click globe | Segment prompt | `onApproximateLayerClick` |
| Selecteer: globe | Child layer + mask | `runPromptSubLayerSegmentation` |
| Replace | Magic replace panel | mask gate pass |
| Duplicate | New layer in document | `handleOperation("duplicate")` |
| Move | Drag transform handle on canvas | `onMoveLayer` (not contextual bar) |
| Cutout | Cutout URL on layer | `handleOneClickCutout` |
| Save | `persist` + project API | `useEditorProjectPersist` |
| Reopen | `?session=` load | `fetchEditorProject` |
| Export PNG | Export hub download | `/api/editor/export/production` |

## Background Flow Test

| Step | Handler |
|------|---------|
| Select background | `selectLayer("background")` |
| Remove background | `handleRemoveBackground` → `/api/editor/segment` remove_background |
| Transparent preview | `applyBackgroundRemovalResult` updates `backgroundUrl` |
| Save | persist document |
| Export transparent PNG | export hub production profile |

## Combine Image Flow Test

| Step | Panel / handler |
|------|-----------------|
| Switch Combineren tab | `modeShowsComposePanels` |
| Brand kit insert | `EditorBrandKitPanel` |
| Library drag | `EditorLibraryDragPanel` + `dropLibraryAssetOnCanvas` |
| Move/resize | placement / compositor transforms |
| Save + export | compositor graph in document → export production |

## Motion Prep Flow Test

| Step | Handler |
|------|---------|
| Start: Motion voorbereiden | `editorFlowMode: motion_prepare` |
| Handoff score | `EditorHandoffScorePanel` |
| Motion preview | `EditorMotionPreviewBar` |
| Open in Motion | asset recommendations → `suite.flow.animateInMotion` |

## Export Flow Test

| Action | API / handler |
|--------|---------------|
| PNG/JPG/WebP | `EditorExportHubPanel` → `/api/editor/export/production` |
| Instagram/TikTok | `EditorSocialKitPanel` presets |
| A4 print | `/api/editor/export/print` |
| Motion-ready | `/api/editor/export/motion-ready` |

## User Trust Enforcement

**Enforced:**

- Hidden: `resize`, `move`, `animate`, `background_blur` (hint-only or broken)
- Hidden: human menu clothing/expression/pose actions
- Removed dead `EditorFloatingToolbar`
- Admin/dev panels gated
- Mask gate blocks pixel edit without real mask

**Rule:** No button shown without real compositor effect or clear disabled reason (mask gate dialog).

## I18N Audit

- Contextual bar: `EDITOR_UX_V7_*_LABEL_KEYS` + `useActiveTranslator`
- Mode tabs: `editor.v5.mode.*`
- Click segment: `editor.clickSegment.*` (NL + EN)
- Mask gate: `editor.maskGate.*`
- No hardcoded action labels in `EditorContextualActionBar`

## Fixes Applied

1. **Tab-based mode gating** — compose/export/GIF panels follow workspace tab, not stale `editorFlowMode`
2. **`modeShowsQuickMotionPanel`** — GIF panel on `quick_motion` tab (was stuck on export-only)
3. **Hidden resize/move** — hint-only actions removed from contextual bar
4. **Removed `EditorFloatingToolbar`** — dead `visible={false}` block
5. **`EditorPlacementQaPanel`** — admin + AI analysis only
6. **Audit tests** — `editor-ui-action-wiring-audit.test.ts`

## Final User Check

A normal user opening a photo can:

- See image + object chips + mode tabs
- Understand selection via chip highlight + green/amber outline
- Use contextual bar actions that switch modes or edit selection
- Get processing feedback via `saveMessage` banner + busy states
- Trust that hidden buttons are gone, not fake
- Save via toolbar; export via Exporteren tab

## Tests / Build Status

See CI run after commit: `editor-ui-action-wiring-audit.test.ts`, `editor-ux-v7.test.ts`, full suite.
