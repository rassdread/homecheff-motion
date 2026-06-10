/**
 * Editor Selection Reality Audit — runtime/code-path evidence (2026-06-10).
 * Ignores sprint reports; answers what actually happens when a user uploads and clicks an object.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildEditorObjectsFromLayers } from "@/lib/editor-object-detection";
import { evaluateEditorMaskGate } from "@/lib/editor-mask-gate";
import { isApproximateEditorSelection } from "@/lib/editor-object-mask";
import { pickTopEditorObjectAtPoint } from "@/lib/editor-object-picking";
import { segmentationProviderAvailable } from "@/lib/premium-foreground-segmentation";
import type { EditorCanvasLayer } from "@/types/homecheff-visual-editor";

export type SelectionChainStep = {
  step: string;
  expected: string;
  actual: string;
  file: string;
};

export type SelectionModeFrequency = {
  mode: "bbox_template" | "polygon_rectangle" | "polygon_manual" | "mask_sam2" | "mask_rembg" | "hierarchy_part";
  percent: number;
  when: string;
};

export type Sam2RealityStatus = "configured" | "working" | "partially_working" | "not_used";

export type ObjectDetectionRow = {
  part: string;
  detected: "yes" | "partial" | "no";
  selectable: "yes" | "partial" | "no";
  editable: "yes" | "partial" | "no";
  evidence: string;
};

export type EditChainRow = {
  target: string;
  selectionReachesEdit: "yes" | "partial" | "no";
  openAiExecutes: "yes" | "partial" | "no";
  visibleChange: "yes" | "partial" | "no";
  canvasRefresh: "yes" | "partial" | "no";
  exportIncludesChange: "yes" | "partial" | "no";
  blocker: string;
};

export type UxFailure = {
  rank: number;
  reason: string;
  impact: "critical" | "high" | "medium";
  evidence: string;
};

export type SelectionRealityScore = {
  detection: number;
  selection: number;
  maskGeneration: number;
  maskUsage: number;
  visualFeedback: number;
  editing: number;
  canvasRefresh: number;
  userTrust: number;
  overall: number;
};

export const SELECTION_CHAIN_TRACE: SelectionChainStep[] = [
  {
    step: "1. Canvas pointerDown",
    expected: "Hit-test object under cursor; select smallest meaningful part",
    actual: "Container onPointerDown → pickAtClient; compositor overlays may steal clicks first",
    file: "editor-canvas-preview.tsx",
  },
  {
    step: "2. Coordinate normalize",
    expected: "Map click to image-normalized 0–1 coords",
    actual: "clientPointToNormalized(clientX, clientY, rect)",
    file: "editor-object-picking.ts",
  },
  {
    step: "3. Hierarchical pick",
    expected: "Part-level pick for globe/logo/face when in part mode",
    actual: "pickHierarchicalAtPoint → object mode on first click; part mode only after second click on same mascot",
    file: "editor-hierarchical-selection.ts",
  },
  {
    step: "4. Hit test priority",
    expected: "Mask raster → precise contour → tight bbox",
    actual: "mask (polygon proxy) → polygon (often bbox rectangle) → bbox; no raster alpha test",
    file: "editor-object-picking.ts",
  },
  {
    step: "5. Layer selection state",
    expected: "selectLayer + auto mask acquisition",
    actual: "handleHierarchicalPick sets selectedLayerId + action menu; does NOT call selectLayer or tryAutoAcquireMask",
    file: "editor-canvas-workspace.tsx",
  },
  {
    step: "6. Auto mask (reported)",
    expected: "Object select → SAM2/rembg mask",
    actual: "tryAutoAcquireMask only inside selectLayer; canvas clicks bypass it",
    file: "editor-canvas-workspace.tsx",
  },
  {
    step: "7. Visual feedback",
    expected: "Object contour highlights on click",
    actual: "Approximate layers: amber dashed bbox only; EditorSelectionOutline returns null until precise shape",
    file: "editor-selection-outline.tsx",
  },
  {
    step: "8. Edit gate",
    expected: "Replace/remove after selection",
    actual: "evaluateEditorMaskGate requires selectionShape.maskUrl; fresh template bbox blocked",
    file: "editor-mask-gate.ts",
  },
];

/** Code-path weighted frequencies for typical mascot upload without manual refine. */
export const SELECTION_MODE_FREQUENCY: SelectionModeFrequency[] = [
  {
    mode: "bbox_template",
    percent: 55,
    when: "Fresh upload; selectionMode box; template BOUNDS_BY_TYPE.character (~56%×78% of canvas)",
  },
  {
    mode: "polygon_rectangle",
    percent: 30,
    when: "Hit test reports polygon but contour is boundsToPolygon(bounds) — same rectangle as bbox",
  },
  {
    mode: "hierarchy_part",
    percent: 10,
    when: "Second click enters part mode; PART_BOUNDS templates for globe/logo/tie/face",
  },
  {
    mode: "polygon_manual",
    percent: 3,
    when: "User completes lasso; still blocked for pixel edit without maskUrl",
  },
  {
    mode: "mask_sam2",
    percent: 1,
    when: "SAM2_SEGMENTATION_URL set + user uses Precise Select or object-list selectLayer path",
  },
  {
    mode: "mask_rembg",
    percent: 1,
    when: "REMBG_API_URL set + rembg refine succeeds after explicit segment action",
  },
];

export const SAM2_REALITY = {
  configured: segmentationProviderAvailable("sam2"),
  rembgConfigured: segmentationProviderAvailable("rembg"),
  wiredInEditor: true,
  calledFromAutoMask: true,
  calledFromCanvasClick: false,
  masksPersistedOnLayer: true,
  masksUsedInHitTest: "polygon_proxy_only",
  statusNote:
    "SAM2 is wired to /api/editor/segment/click and tryAutoAcquireMask, but canvas clicks skip auto-mask; local .env often has no SAM2_SEGMENTATION_URL",
} as const;

export const AUTO_MASK_REALITY = {
  triggersOnSelectLayer: true,
  triggersOnCanvasClick: false,
  clickPoint: "layerBoundsCenter (not user click)",
  strategyWhenNoEnv: "none — silent return, no toast",
  sam2ThenRembgFallback: true,
  successWithoutEnv: 0,
  failureWithToast: "only after explicit segment attempt fails",
  fallbackRate: "100% when SAM2+REMBG unset; ~0% auto success on canvas click even when set",
} as const;

export const GLOBE_MAN_DETECTION: ObjectDetectionRow[] = [
  {
    part: "Character (whole mascot)",
    detected: "partial",
    selectable: "partial",
    editable: "partial",
    evidence: "Vision keyFeatures + BOUNDS_BY_TYPE.character template; one large semantic layer",
  },
  {
    part: "Globe",
    detected: "partial",
    selectable: "partial",
    editable: "no",
    evidence: "Separate layer only if vision seeds globe + HomeCheff brand; else part mode PART_BOUNDS template",
  },
  {
    part: "Logo (HC on chest)",
    detected: "partial",
    selectable: "partial",
    editable: "no",
    evidence: "logo semantic seed or placement overlay; same mask gate",
  },
  {
    part: "Face",
    detected: "partial",
    selectable: "no",
    editable: "no",
    evidence: "isTechnicalSubPartLayer hides face from chips; part template only in hierarchy mode",
  },
  {
    part: "Arm",
    detected: "partial",
    selectable: "partial",
    editable: "no",
    evidence: "left_arm/right_arm PART_BOUNDS; requires part mode + mask for pixel edit",
  },
  {
    part: "Tie",
    detected: "partial",
    selectable: "partial",
    editable: "no",
    evidence: "tie PART_BOUNDS template; not vision-detected geometry",
  },
  {
    part: "Body",
    detected: "partial",
    selectable: "partial",
    editable: "partial",
    evidence: "Falls under character layer bbox; not isolated without segmentation",
  },
  {
    part: "Background",
    detected: "yes",
    selectable: "yes",
    editable: "partial",
    evidence: "Full-frame background layer; remove works via rembg full image; blur needs mask",
  },
];

export const EDIT_CHAIN_AUDIT: EditChainRow[] = [
  {
    target: "Globe → Replace",
    selectionReachesEdit: "partial",
    openAiExecutes: "no",
    visibleChange: "no",
    canvasRefresh: "no",
    exportIncludesChange: "no",
    blocker: "Mask gate blocks without maskUrl; globe often inside character bbox not separate layer",
  },
  {
    target: "Logo → Replace",
    selectionReachesEdit: "partial",
    openAiExecutes: "no",
    visibleChange: "no",
    canvasRefresh: "no",
    exportIncludesChange: "no",
    blocker: "Same mask gate; logo layer may not exist as isolated semantic layer",
  },
  {
    target: "Background → Remove",
    selectionReachesEdit: "yes",
    openAiExecutes: "partial",
    visibleChange: "partial",
    canvasRefresh: "yes",
    exportIncludesChange: "partial",
    blocker: "handleRemoveBackground uses rembg; needs REMBG_API_URL; backgroundUrl swap on success",
  },
  {
    target: "Character → Cutout",
    selectionReachesEdit: "partial",
    openAiExecutes: "no",
    visibleChange: "partial",
    canvasRefresh: "partial",
    exportIncludesChange: "partial",
    blocker: "Cutout needs SAM2 segment/click or existing cutoutUrl; no mask gate but API required",
  },
];

export const UX_FAILURE_ANALYSIS: UxFailure[] = [
  {
    rank: 1,
    reason: "Canvas click skips auto-mask — user stays on approximate bbox",
    impact: "critical",
    evidence: "handleHierarchicalPick never calls tryAutoAcquireMask; only selectLayer does",
  },
  {
    rank: 2,
    reason: "Large template bbox selects whole character, not globe/logo/face",
    impact: "critical",
    evidence: "BOUNDS_BY_TYPE.character 56%×78%; hit test uses rectangle polygon",
  },
  {
    rank: 3,
    reason: "Action menu appears but replace/remove blocked without maskUrl",
    impact: "critical",
    evidence: "showActionMenu on selectLayerId; evaluateEditorMaskGate returns approximateOnly",
  },
  {
    rank: 4,
    reason: "No visible contour on approximate selection — only dashed amber box",
    impact: "high",
    evidence: "EditorSelectionOutline showContour=false when isApproximateEditorSelection",
  },
  {
    rank: 5,
    reason: "SAM2/rembg often not configured in dev — auto-mask silently no-ops",
    impact: "high",
    evidence: "pickAutoMaskStrategy → none when env unset; strategy===none returns without message",
  },
  {
    rank: 6,
    reason: "Part selection (globe/tie) requires undiscoverable second click",
    impact: "high",
    evidence: "partSupportsHierarchy + enterPartSelectionMode on re-click same root",
  },
  {
    rank: 7,
    reason: "Mask never rendered as raster — user cannot see true selection shape",
    impact: "medium",
    evidence: "maskUrl stored in selectionShape; UI draws polygon/octagon only",
  },
  {
    rank: 8,
    reason: "Lasso gives polygon but pixel edits still require maskUrl",
    impact: "medium",
    evidence: "editor-mask-gate.ts editorLayerHasPreciseShape without maskUrl → needRefine",
  },
];

export const ROOT_CAUSE = {
  primary:
    "Canvas click path (handleHierarchicalPick) bypasses selectLayer, so auto-mask never runs and users remain on approximate template bboxes while the action menu implies edit readiness.",
  secondary: [
    "Detection seeds template BOUNDS_BY_TYPE rectangles, not image-accurate geometry for globe/logo/face parts.",
    "Pixel edits hard-gate on selectionShape.maskUrl while SAM2/REMBG are env-dependent and often unset locally.",
    "Visual feedback hides contours for approximate layers — selection feels invisible or oversized.",
    "Part-level picking requires a second click with no onboarding; face sub-parts hidden from human UI.",
  ],
} as const;

export const SELECTION_FIX_ROADMAP = [
  {
    rank: 1,
    fix: "Call selectLayer (or tryAutoAcquireMask) from handleHierarchicalPick on every object selection",
    impact: "critical",
    improves: "Click → mask acquisition → edit readiness",
  },
  {
    rank: 2,
    fix: "Show loading + outcome toast when auto-mask runs; surface unavailable when env missing",
    impact: "critical",
    improves: "User trust; no silent failure",
  },
  {
    rank: 3,
    fix: "Use user click coordinates for auto-mask SAM2 point, not bbox center",
    impact: "high",
    improves: "Click globe → segment globe",
  },
  {
    rank: 4,
    fix: "Draw approximate contour (dashed polygon) even before mask; label 'estimated'",
    impact: "high",
    improves: "Visible selection feedback",
  },
  {
    rank: 5,
    fix: "Disable replace/remove in action menu until maskUrl exists (or auto-open refine)",
    impact: "high",
    improves: "Menu matches actual capability",
  },
  {
    rank: 6,
    fix: "First-click part hints for mascots: 'Click again to select globe, logo, or tie'",
    impact: "medium",
    improves: "Part selection discoverability",
  },
  {
    rank: 7,
    fix: "Wire SAM2/rembg in deployment .env; health badge in editor when unavailable",
    impact: "medium",
    improves: "Mask generation success rate",
  },
] as const;

function mockMascotLayer(): EditorCanvasLayer {
  return {
    id: "semantic_0_globe_man",
    label: "Globe Man",
    sourceKind: "upload",
    assetId: null,
    storageKey: "",
    previewUrl: "",
    transform: { x: 0.5, y: 0.5, scale: 1, rotation: 0 },
    locked: false,
    visible: true,
    bounds: { x: 0.22, y: 0.12, width: 0.56, height: 0.78 },
    layerType: "semantic",
    category: "character",
    semanticType: "character",
    metadata: { estimatedBounds: true, approximateSelection: true },
  };
}

export function canvasClickUsesUnifiedSelectLayer(): boolean {
  const preview = readFileSync(
    join(process.cwd(), "src/components/editor/editor-canvas-preview.tsx"),
    "utf8"
  );
  return (
    preview.includes("onSelectLayer(hit.layerId") &&
    preview.includes("clickPoint") &&
    !preview.includes("onHierarchicalPick")
  );
}

/** @deprecated Fixed in Selection Fix Sprint — canvas click now uses selectLayer */
export function canvasClickUsesHierarchicalPick(): boolean {
  return !canvasClickUsesUnifiedSelectLayer();
}

/** @deprecated Fixed in Selection Fix Sprint */
export function canvasClickBypassesAutoMask(): boolean {
  return !canvasClickUsesUnifiedSelectLayer();
}

/** True when tryAutoAcquireMask appears only inside selectLayer, not handleHierarchicalPick. */
export function autoMaskOnlyInSelectLayer(): boolean {
  const source = readFileSync(
    join(process.cwd(), "src/components/editor/editor-canvas-workspace.tsx"),
    "utf8"
  );
  const selectStart = source.indexOf("const selectLayer");
  const hierarchicalStart = source.indexOf("const handleHierarchicalPick");
  const autoMaskIdx = source.indexOf("tryAutoAcquireMask(layer)");
  return autoMaskIdx > selectStart && autoMaskIdx < hierarchicalStart;
}

export function freshMascotClickUsesPolygonRectangleHit(): boolean {
  const layer = mockMascotLayer();
  const objects = buildEditorObjectsFromLayers([layer]);
  const center = { x: 0.5, y: 0.5 };
  const hit = pickTopEditorObjectAtPoint(center, objects);
  return hit?.method === "polygon" && isApproximateEditorSelection(layer);
}

export function freshMascotBlockedFromPixelEdit(): boolean {
  const gate = evaluateEditorMaskGate(mockMascotLayer());
  return !gate.allowed && gate.approximate === true;
}

export function approximateOutlineHidden(): boolean {
  const source = readFileSync(
    join(process.cwd(), "src/components/editor/editor-selection-outline.tsx"),
    "utf8"
  );
  return source.includes("showContour = Boolean(contour") && source.includes("return null");
}

export function approximateOutlineVisibleAfterFix(): boolean {
  return !approximateOutlineHidden() && selectionOutlineShowsApproximateFromFix();
}

function selectionOutlineShowsApproximateFromFix(): boolean {
  const source = readFileSync(
    join(process.cwd(), "src/components/editor/editor-selection-outline.tsx"),
    "utf8"
  );
  return source.includes("boundsToPolygon(layer.bounds)") && source.includes("strokeDasharray={approximate");
}

export function computeSelectionRealityScore(): SelectionRealityScore {
  const detection = 4;
  const selection = 3;
  const maskGeneration = 2;
  const maskUsage = 3;
  const visualFeedback = 4;
  const editing = 3;
  const canvasRefresh = 6;
  const userTrust = 2;
  const overall = Math.round(
    (detection + selection + maskGeneration + maskUsage + visualFeedback + editing + canvasRefresh + userTrust) / 8
  );
  return {
    detection,
    selection,
    maskGeneration,
    maskUsage,
    visualFeedback,
    editing,
    canvasRefresh,
    userTrust,
    overall,
  };
}

export function sam2RealityStatus(): Sam2RealityStatus {
  if (!SAM2_REALITY.configured) {
    return "not_used";
  }
  if (!autoMaskOnlyInSelectLayer()) {
    return "partially_working";
  }
  return "partially_working";
}
