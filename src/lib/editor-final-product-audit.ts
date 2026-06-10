/**
 * Editor Final Product Audit — evidence constants (2026-06-10).
 * No runtime behavior; documents gaps discovered from code/UI/API traces.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { actionEditReadiness } from "@/lib/editor-ux-cleanup";

export const EDITOR_SESSION_STORAGE_KEY = "hc-editor-canvas-sessions-v1";

export type AuditGapSeverity = "broken" | "partial" | "misleading" | "missing" | "duplicate" | "over_engineered";

export type UserExpectationRow = {
  screen: string;
  action: string;
  expected: string;
  actual: string;
  gap: AuditGapSeverity;
};

export type ClickChainStatus = "complete" | "breaks_before_pixels" | "breaks_before_persist" | "metadata_only";

export type ClickChainRow = {
  action: string;
  handler: string;
  api: string | null;
  pixelsChange: boolean;
  serverPersist: boolean;
  status: ClickChainStatus;
  breakPoint: string;
};

export type ObjectSelectRow = {
  objectType: string;
  selectable: boolean;
  reliable: boolean;
  blocker: string;
};

export type ImageEditStatus = "working" | "partial" | "fake" | "broken";

export type ImageEditRow = {
  operation: string;
  status: ImageEditStatus;
  evidence: string;
};

export type PipelineStepStatus = "pass" | "partial" | "fail";

export type PipelineMatrixRow = {
  step: string;
  status: PipelineStepStatus;
  note: string;
};

export type UiComplexityCategory = "essential" | "useful" | "advanced" | "developer" | "redundant" | "remove_candidate";

export type UiComplexityRow = {
  id: string;
  label: string;
  category: UiComplexityCategory;
  reason: string;
};

export type BlockerRow = {
  rank: number;
  blocker: string;
  impact: "critical" | "high" | "medium" | "low";
  effort: "low" | "medium" | "high";
  sprint: string;
};

/** Part 1 — representative expectation gaps (not exhaustive). */
export const USER_EXPECTATION_AUDIT: UserExpectationRow[] = [
  {
    screen: "Canvas workspace",
    action: "Replace object",
    expected: "Selected object pixels change on canvas",
    actual: "Opens magic-replace panel; needs maskUrl + OpenAI API; else metadata-only layer patch",
    gap: "partial",
  },
  {
    screen: "Canvas workspace",
    action: "Remove object",
    expected: "Object inpainted away from image",
    actual: "Without mask: layer removed from list only; backgroundUrl unchanged",
    gap: "partial",
  },
  {
    screen: "Toolbar",
    action: "Save draft",
    expected: "Saved project recoverable on any device",
    actual: "localStorage only; buildEditorSavePayload never sent to /api/editor/save",
    gap: "misleading",
  },
  {
    screen: "Review panel",
    action: "Save to Library",
    expected: "Reusable library asset with thumbnail",
    actual: "POST /api/editor/save persists reference image + semantic record (when auth OK)",
    gap: "partial",
  },
  {
    screen: "Export hub",
    action: "Export production / print",
    expected: "Download matches canvas composition (logo, cutouts, placements)",
    actual: "Server resizes document.backgroundUrl only; ignores importedLayers and most overlays",
    gap: "partial",
  },
  {
    screen: "Export hub",
    action: "GIF export",
    expected: "Animated GIF of selection",
    actual: "Single-frame GIF from backgroundUrl via sharp",
    gap: "misleading",
  },
  {
    screen: "Brand kit / library drag",
    action: "Insert logo",
    expected: "Logo visible on canvas",
    actual: "Appends importedLayers; EditorCanvasPreview does not render importedLayers",
    gap: "broken",
  },
  {
    screen: "Cutout",
    action: "One-click cutout",
    expected: "Transparent cutout visible on canvas",
    actual: "cutoutUrl stored on layer; preview still shows backgroundUrl only",
    gap: "partial",
  },
  {
    screen: "Magic edit bar",
    action: "Submit prompt",
    expected: "Image updates immediately",
    actual: "buildEditorCommandPlan only; user must Apply plan in preview panel",
    gap: "partial",
  },
  {
    screen: "Motion handoff",
    action: "Open in Motion",
    expected: "Wizard pre-filled with editor cutout",
    actual: "URL includes editorSession; resolveEditorMotionBootstrap not wired in Motion UI",
    gap: "broken",
  },
  {
    screen: "Start screen post-upload",
    action: "Magic bar on mode picker",
    expected: "Describe edit before entering workspace",
    actual: "EditorPostUploadModePicker onMagicCommand not passed from EditorStartScreen",
    gap: "missing",
  },
  {
    screen: "Background tools",
    action: "Blur background",
    expected: "Background blurred in image",
    actual: "runMaskedEdit requires maskUrl; background layer typically has none",
    gap: "broken",
  },
];

/** Part 2 — click-to-result chains. */
export const CLICK_TO_RESULT_AUDIT: ClickChainRow[] = [
  {
    action: "Replace",
    handler: "handleMagicReplaceApply → runMaskedEdit",
    api: "POST /api/editor/edit/replace",
    pixelsChange: true,
    serverPersist: true,
    status: "breaks_before_pixels",
    breakPoint: "Requires selectionShape.maskUrl; UX v7 opens panel first",
  },
  {
    action: "Remove",
    handler: "handleOperation(delete) / runMaskedEdit",
    api: "POST /api/editor/edit/remove",
    pixelsChange: true,
    serverPersist: true,
    status: "breaks_before_pixels",
    breakPoint: "Unmasked delete removes layer record only",
  },
  {
    action: "Cutout",
    handler: "handleOneClickCutout → persistCutoutToLibrary",
    api: "POST /api/editor/segment/click",
    pixelsChange: false,
    serverPersist: true,
    status: "breaks_before_pixels",
    breakPoint: "cutoutUrl not composited on canvas preview",
  },
  {
    action: "Duplicate",
    handler: "applyEditorLayerOperation(duplicate)",
    api: null,
    pixelsChange: false,
    serverPersist: false,
    status: "metadata_only",
    breakPoint: "Second bbox only; humanFirst hides unselected boxes",
  },
  {
    action: "Animate",
    handler: "attachMotionPreview",
    api: null,
    pixelsChange: false,
    serverPersist: false,
    status: "metadata_only",
    breakPoint: "CSS overlay only, not rendered asset",
  },
  {
    action: "Motion ready export",
    handler: "EditorExportHubPanel.runExport",
    api: "POST /api/editor/export/motion-ready",
    pixelsChange: false,
    serverPersist: false,
    status: "breaks_before_persist",
    breakPoint: "JSON manifest download; appendLibraryExport local only",
  },
  {
    action: "Library save (review)",
    handler: "persistEditorSave",
    api: "POST /api/editor/save",
    pixelsChange: false,
    serverPersist: true,
    status: "complete",
    breakPoint: "Requires Review panel, not toolbar draft",
  },
  {
    action: "Brand kit insert",
    handler: "insertBrandKitItemOnCanvas",
    api: null,
    pixelsChange: false,
    serverPersist: false,
    status: "breaks_before_pixels",
    breakPoint: "importedLayers not painted on main canvas",
  },
  {
    action: "Magic edit",
    handler: "handleV7CommandSubmit → handleV7PlanApply",
    api: "varies per plan step",
    pixelsChange: true,
    serverPersist: false,
    status: "breaks_before_pixels",
    breakPoint: "Submit creates plan; Apply required; detect_object steps no-op",
  },
];

/** Part 3 — object selection reliability. */
export const OBJECT_SELECTION_AUDIT: ObjectSelectRow[] = [
  {
    objectType: "Mascot / character",
    selectable: true,
    reliable: false,
    blocker: "Vision template BOUNDS_BY_TYPE or ONNX IoU merge; approximate until SAM2/lasso",
  },
  {
    objectType: "Logo",
    selectable: true,
    reliable: false,
    blocker: "Same bbox pipeline; placements separate from semantic layers",
  },
  {
    objectType: "Globe",
    selectable: true,
    reliable: false,
    blocker: "Feature keyword + template bounds",
  },
  {
    objectType: "Face",
    selectable: false,
    reliable: false,
    blocker: "Hidden sub-part; PART_BOUNDS template inside mascot hierarchy only",
  },
  {
    objectType: "Text",
    selectable: true,
    reliable: false,
    blocker: "Vision seed bounds; no OCR box geometry on canvas",
  },
  {
    objectType: "Background",
    selectable: true,
    reliable: true,
    blocker: "Full-frame layer; not in human object pills",
  },
];

/** Part 4 — real pixel editing. */
export const REAL_IMAGE_EDITING_AUDIT: ImageEditRow[] = [
  { operation: "Masked OpenAI replace", status: "working", evidence: "runMaskedEdit updates backgroundUrl from API result" },
  { operation: "Masked OpenAI remove", status: "working", evidence: "executeEditorMaskedRemoveApi + backgroundUrl swap" },
  { operation: "Unmasked replace/remove", status: "fake", evidence: "applyEditorLayerOperation metadata only" },
  { operation: "Background remove (segment)", status: "partial", evidence: "Mask on layer; backgroundUrl often unchanged" },
  { operation: "Background blur/sky", status: "broken", evidence: "runMaskedEdit guard on maskUrl" },
  { operation: "Cutout PNG", status: "partial", evidence: "Server cutoutUrl; not shown on canvas" },
  { operation: "Brand kit / library composite", status: "fake", evidence: "importedLayers stored, not rendered" },
  { operation: "Placement logo overlay", status: "partial", evidence: "placement.previewUrl rendered; not in server export" },
  { operation: "Combine images (dual composer)", status: "partial", evidence: "DualComposerPanel counts layers; main preview unchanged" },
  { operation: "Poster template", status: "fake", evidence: "exportSettings only until export (background-only render)" },
  { operation: "GIF export", status: "partial", evidence: "Single static frame GIF" },
  { operation: "Translate text", status: "broken", evidence: "V7 plan step toast only" },
];

/** Part 7 — pipeline matrix. */
export const PIPELINE_COMPLETION_MATRIX: PipelineMatrixRow[] = [
  { step: "Upload", status: "pass", note: "Blob upload + local session" },
  { step: "Edit (pixels)", status: "partial", note: "Masked AI path only; composition not WYSIWYG" },
  { step: "Save (toolbar draft)", status: "partial", note: "localStorage only" },
  { step: "Save (library)", status: "partial", note: "Review path + cutout auto-save; export hub local metadata" },
  { step: "Library reuse", status: "partial", note: "Derivation sources list; no search; compose mode" },
  { step: "Studio", status: "partial", note: "Banner from local session; no auto storyboard import" },
  { step: "Motion", status: "fail", note: "Bootstrap helper exists; instant page does not consume query params" },
  { step: "Publish", status: "partial", note: "Works from Motion render, not from Editor directly" },
  { step: "Export download", status: "partial", note: "Real files but background-only composite" },
];

/** Part 8 — UI complexity (visible in workspace). */
export const UX_COMPLEXITY_AUDIT: UiComplexityRow[] = [
  { id: "magic_edit_bar", label: "Magic edit bar", category: "essential", reason: "Primary AI entry when wired" },
  { id: "contextual_action_bar", label: "Contextual object actions", category: "essential", reason: "Replace/remove/cutout entry" },
  { id: "human_object_list", label: "Object chips", category: "essential", reason: "Selection without bbox guesswork" },
  { id: "canvas_preview", label: "Canvas", category: "essential", reason: "Core surface (currently under-renders)" },
  { id: "selection_tools", label: "SAM2 / lasso / refine", category: "useful", reason: "Required for precise masks" },
  { id: "export_hub", label: "Export hub", category: "useful", reason: "Download path exists" },
  { id: "review_panel", label: "Review save", category: "essential", reason: "Only reliable server library save" },
  { id: "assistant_sidebar", label: "AI assistant sidebar", category: "advanced", reason: "Duplicates magic bar; collapsed default" },
  { id: "properties_panel", label: "Technical properties", category: "developer", reason: "Semantic/debug fields" },
  { id: "layer_tree_advanced", label: "Full layer tree", category: "advanced", reason: "When showAiAnalysis on" },
  { id: "body_designer", label: "Body designer sliders", category: "advanced", reason: "Character niche" },
  { id: "placement_qa", label: "Placement QA panel", category: "developer", reason: "Internal QA" },
  { id: "composition_graph", label: "Composition graph", category: "developer", reason: "No user outcome" },
  { id: "floating_toolbar", label: "Floating toolbar", category: "redundant", reason: "visible={false} in workspace" },
  { id: "quick_action_bar", label: "Quick action bar", category: "remove_candidate", reason: "Component exists, never mounted" },
  { id: "workflow_step_label", label: "Workflow step indicator", category: "advanced", reason: "Internal pipeline state" },
  { id: "handoff_score", label: "Motion handoff score", category: "useful", reason: "Motion prepare mode only" },
  { id: "dual_composer", label: "Dual composer", category: "useful", reason: "Combine mode; preview gap" },
];

/** Part 12 — top blockers. */
export const TOP_25_BLOCKERS: BlockerRow[] = [
  { rank: 1, blocker: "Canvas preview renders backgroundUrl only — not importedLayers, cutouts, or full composition", impact: "critical", effort: "high", sprint: "Sprint 1 — WYSIWYG compositor" },
  { rank: 2, blocker: "Object selection uses template/estimated bboxes until manual SAM2/lasso", impact: "critical", effort: "high", sprint: "Sprint 1 — selection truth" },
  { rank: 3, blocker: "Replace/remove without maskUrl are metadata-only (no pixel edit)", impact: "critical", effort: "medium", sprint: "Sprint 1 — mask-or-segment gate UX" },
  { rank: 4, blocker: "Server export resizes backgroundUrl only — placements/composition dropped", impact: "critical", effort: "high", sprint: "Sprint 1 — export compositor" },
  { rank: 5, blocker: "Editor sessions localStorage-only — no server project CRUD", impact: "critical", effort: "high", sprint: "Sprint 1 — project persistence" },
  { rank: 6, blocker: "Toolbar Save Draft does not call /api/editor/save", impact: "high", effort: "low", sprint: "Sprint 1 — honest save" },
  { rank: 7, blocker: "Motion instant page does not consume editorSession/editorAsset params", impact: "high", effort: "medium", sprint: "Sprint 2 — Motion bootstrap wire-up" },
  { rank: 8, blocker: "Studio shows banner only — no editor session → storyboard import", impact: "high", effort: "high", sprint: "Sprint 2 — Studio import" },
  { rank: 9, blocker: "Background blur/sky tools fail without mask on background layer", impact: "high", effort: "medium", sprint: "Sprint 1 — background segment first" },
  { rank: 10, blocker: "Magic edit requires Submit + Apply (two-step); post-upload magic bar unwired", impact: "high", effort: "low", sprint: "Sprint 1 — flow polish" },
  { rank: 11, blocker: "GIF export is single-frame static GIF, not animation", impact: "high", effort: "medium", sprint: "Sprint 2 — honest GIF or hide" },
  { rank: 12, blocker: "Cutout success not visible on canvas (cutoutUrl stored only)", impact: "high", effort: "medium", sprint: "Sprint 1 — cutout preview layer" },
  { rank: 13, blocker: "No project delete / archive / unsaved back warning", impact: "medium", effort: "low", sprint: "Sprint 1 — lifecycle hygiene" },
  { rank: 14, blocker: "Export hub libraryExports local metadata — not server library entity", impact: "medium", effort: "medium", sprint: "Sprint 2 — export→library persist" },
  { rank: 15, blocker: "Duplicate layer invisible in humanFirst until selected", impact: "medium", effort: "low", sprint: "Sprint 1 — duplicate feedback" },
  { rank: 16, blocker: "Translate text V7 step is toast-only", impact: "medium", effort: "medium", sprint: "Sprint 3 — hide or implement" },
  { rank: 17, blocker: "Face not directly selectable — template sub-part bounds", impact: "medium", effort: "high", sprint: "Sprint 3 — face detection" },
  { rank: 18, blocker: "SAM2/rembg env-gated — 503 without configuration", impact: "medium", effort: "low", sprint: "Sprint 1 — disable + explain" },
  { rank: 19, blocker: "Library browse in editor has no search — scroll only", impact: "medium", effort: "medium", sprint: "Sprint 2 — library search" },
  { rank: 20, blocker: "listLocalEditorSavedRecords fallback never surfaced in UI", impact: "medium", effort: "low", sprint: "Sprint 2 — recover failed saves" },
  { rank: 21, blocker: "Poster/social presets change settings only until export", impact: "medium", effort: "low", sprint: "Sprint 1 — preset preview" },
  { rank: 22, blocker: "EditorFloatingToolbar mounted with visible={false}", impact: "low", effort: "low", sprint: "Sprint 1 — remove dead UI" },
  { rank: 23, blocker: "EditorQuickActionBar never mounted", impact: "low", effort: "low", sprint: "Sprint 1 — remove dead code" },
  { rank: 24, blocker: "Dual assistant (magic bar + sidebar) overlap", impact: "low", effort: "low", sprint: "Sprint 2 — consolidate AI entry" },
  { rank: 25, blocker: "Motion-ready manifest is JSON not ZIP bundle of cutouts/masks", impact: "medium", effort: "medium", sprint: "Sprint 2 — motion package format" },
];

export function canvasPreviewRendersImportedLayers(): boolean {
  const source = readFileSync(
    join(process.cwd(), "src/components/editor/editor-canvas-preview.tsx"),
    "utf8"
  );
  return source.includes("EditorCompositorOverlays");
}

export function motionBootstrapWiredInApp(): boolean {
  try {
    const instantPage = readFileSync(join(process.cwd(), "src/app/animate/instant/page.tsx"), "utf8");
    return (
      instantPage.includes("EditorMotionBootstrapBridge") &&
      instantPage.includes("EditorMotionBootstrapApply")
    );
  } catch {
    return false;
  }
}

export function editorProjectDeleteExists(): boolean {
  const sessionSource = readFileSync(join(process.cwd(), "src/lib/editor-canvas-session.ts"), "utf8");
  return /deleteEditor|removeEditor.*Session|deleteSession/.test(sessionSource);
}

export function exportUsesCompositorState(): boolean {
  const source = readFileSync(join(process.cwd(), "src/server/editor/render-editor-export.ts"), "utf8");
  return source.includes("renderEditorCompositionPng");
}

/** @deprecated Use exportUsesCompositorState — inverted after Source of Truth sprint */
export function exportUsesBackgroundOnly(): boolean {
  return !exportUsesCompositorState();
}

export function replaceReadinessIsPartial(): boolean {
  return actionEditReadiness("replace") === "partially_works";
}
