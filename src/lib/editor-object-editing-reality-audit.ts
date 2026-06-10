/**
 * Editor Object Editing Reality Audit — evidence constants (2026-06-10).
 * Answers: can a normal user select, modify, see, and save object edits on real uploads?
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { actionEditReadiness } from "@/lib/editor-ux-cleanup";
import { planEditorSmartRemove } from "@/lib/editor-smart-remove";
import { planEditorSmartReplace } from "@/lib/editor-smart-replace";
import type { EditorCanvasLayer } from "@/types/homecheff-visual-editor";

export type RealityLevel = "yes" | "partial" | "no";
export type EditConfidence = "high" | "medium" | "low" | "none";

export type ObjectSelectionRow = {
  objectType: string;
  detected: RealityLevel;
  selectable: RealityLevel;
  highlightVisible: RealityLevel;
  editable: RealityLevel;
  confidence: EditConfidence;
  evidence: string;
};

export type MaskGeometrySource = "bbox_template" | "bbox_onnx" | "polygon_heuristic" | "polygon_manual" | "mask_sam2" | "mask_rembg" | "none";

export type MaskTruthRow = {
  stage: string;
  source: MaskGeometrySource;
  real: boolean;
  estimated: boolean;
  requiresUserAction: string | null;
};

export type PixelChangeRow = {
  action: string;
  pixelsChange: boolean;
  metadataOnly: boolean;
  evidence: string;
};

export type AppearanceFeatureRow = {
  feature: string;
  status: "working" | "partial" | "placeholder" | "not_implemented";
  evidence: string;
};

export type ObjectEditingScore = {
  selection: number;
  masks: number;
  replace: number;
  remove: number;
  background: number;
  insert: number;
  persistence: number;
  visualFeedback: number;
  pixelEditing: number;
  overall: number;
};

export const OBJECT_SELECTION_REALITY: ObjectSelectionRow[] = [
  {
    objectType: "mascot",
    detected: "partial",
    selectable: "partial",
    highlightVisible: "partial",
    editable: "partial",
    confidence: "low",
    evidence: "Vision keyFeatures + BOUNDS_BY_TYPE.character; ONNX person if model runs",
  },
  {
    objectType: "person",
    detected: "partial",
    selectable: "partial",
    highlightVisible: "partial",
    editable: "partial",
    confidence: "low",
    evidence: "ONNX person detection optional; else template character bounds",
  },
  {
    objectType: "face",
    detected: "partial",
    selectable: "no",
    highlightVisible: "no",
    editable: "no",
    confidence: "none",
    evidence: "isTechnicalSubPartLayer hides face; PART_BOUNDS template only in hierarchy mode",
  },
  {
    objectType: "globe",
    detected: "partial",
    selectable: "partial",
    highlightVisible: "partial",
    editable: "partial",
    confidence: "low",
    evidence: "HomeCheff brand keyword + BOUNDS_BY_TYPE or ONNX sports ball merge",
  },
  {
    objectType: "logo",
    detected: "partial",
    selectable: "partial",
    highlightVisible: "partial",
    editable: "partial",
    confidence: "medium",
    evidence: "Semantic logo type or placement overlay (separate from semantic layer)",
  },
  {
    objectType: "text",
    detected: "partial",
    selectable: "partial",
    highlightVisible: "partial",
    editable: "partial",
    confidence: "low",
    evidence: "Vision text seed; BOUNDS_BY_TYPE.text; no OCR box geometry",
  },
  {
    objectType: "background",
    detected: "yes",
    selectable: "yes",
    highlightVisible: "partial",
    editable: "partial",
    confidence: "medium",
    evidence: "Always seeded full-frame; not in object chips; blur needs mask",
  },
  {
    objectType: "clothing",
    detected: "partial",
    selectable: "partial",
    highlightVisible: "partial",
    editable: "no",
    confidence: "none",
    evidence: "BOUNDS_BY_TYPE.clothing if vision seeds; change_clothing is placeholder",
  },
  {
    objectType: "accessory",
    detected: "partial",
    selectable: "partial",
    highlightVisible: "partial",
    editable: "partial",
    confidence: "low",
    evidence: "Accessory seed + template bounds; same mask gate as replace",
  },
];

export const MASK_TRUTH_PIPELINE: MaskTruthRow[] = [
  { stage: "After upload (default)", source: "bbox_template", real: false, estimated: true, requiresUserAction: null },
  { stage: "ONNX detect merge", source: "bbox_onnx", real: true, estimated: false, requiresUserAction: null },
  { stage: "Segment /api/editor/segment", source: "mask_rembg", real: true, estimated: false, requiresUserAction: "Select layer + refine/remove bg" },
  { stage: "Heuristic segment fallback", source: "polygon_heuristic", real: false, estimated: true, requiresUserAction: "REMBG_API_URL unset" },
  { stage: "SAM2 /api/editor/segment/click", source: "mask_sam2", real: true, estimated: false, requiresUserAction: "SAM2_SEGMENTATION_URL + cutout flow" },
  { stage: "Manual lasso", source: "polygon_manual", real: true, estimated: false, requiresUserAction: "User draws polygon" },
  { stage: "runMaskedEdit gate", source: "none", real: false, estimated: false, requiresUserAction: "selectionShape.maskUrl required (line 394-397 workspace)" },
];

export const PIXEL_CHANGE_AUDIT: PixelChangeRow[] = [
  { action: "Replace (masked OpenAI)", pixelsChange: true, metadataOnly: false, evidence: "backgroundUrl := api.resultUrl" },
  { action: "Replace (no mask)", pixelsChange: false, metadataOnly: true, evidence: "applyEditorLayerOperation default patch only" },
  { action: "Remove (masked)", pixelsChange: true, metadataOnly: false, evidence: "runMaskedEdit delete + backgroundUrl swap" },
  { action: "Remove (no mask)", pixelsChange: false, metadataOnly: true, evidence: "Layer removed from objects[] only" },
  { action: "Background remove (segment)", pixelsChange: false, metadataOnly: true, evidence: "Mask on layer; backgroundUrl unchanged" },
  { action: "Background blur/sky", pixelsChange: false, metadataOnly: true, evidence: "runMaskedEdit aborts without bg maskUrl" },
  { action: "Cutout", pixelsChange: false, metadataOnly: true, evidence: "cutoutUrl stored; canvas shows backgroundUrl img only" },
  { action: "Brand kit logo insert", pixelsChange: false, metadataOnly: true, evidence: "importedLayers not rendered in EditorCanvasPreview" },
  { action: "Placement logo insert", pixelsChange: true, metadataOnly: false, evidence: "placement.previewUrl overlay on canvas" },
  { action: "Move/resize layer", pixelsChange: false, metadataOnly: true, evidence: "Transform + bbox overlay only" },
  { action: "Motion prepare", pixelsChange: false, metadataOnly: true, evidence: "Handoff metadata + CSS preview overlay" },
];

export const APPEARANCE_AUDIT: AppearanceFeatureRow[] = [
  { feature: "Change jacket color", status: "partial", evidence: "magic_replace / masked replace if mask exists; no clothing-specific path" },
  { feature: "Change jacket type", status: "placeholder", evidence: "change_clothing hidden from human UI; maps to replace operation" },
  { feature: "Replace clothing", status: "partial", evidence: "Same as replace; requires mask + OpenAI" },
  { feature: "Change expression", status: "placeholder", evidence: "actionEditReadiness change_expression = placeholder" },
  { feature: "Change appearance (edit_appearance)", status: "not_implemented", evidence: "handleHumanAction edit_appearance closes menu only (line 605-607)" },
  { feature: "Body designer sliders", status: "partial", evidence: "Updates bodyDesigner params; does not repaint mascot pixels" },
];

export const TOP_15_OBJECT_EDITING_BLOCKERS = [
  { rank: 1, blocker: "runMaskedEdit hard-requires maskUrl — fresh uploads have template bboxes only", impact: "critical", effort: "medium", dependency: "SAM2/rembg or auto-segment on select" },
  { rank: 2, blocker: "Canvas preview = single backgroundUrl; cutouts/importedLayers not composited", impact: "critical", effort: "high", dependency: "Client compositor" },
  { rank: 3, blocker: "humanFirst hides unselected layer boxes — click must use invisible bbox or chips", impact: "critical", effort: "low", dependency: "Selection visibility" },
  { rank: 4, blocker: "Template BOUNDS_BY_TYPE not image geometry", impact: "critical", effort: "high", dependency: "Detection quality" },
  { rank: 5, blocker: "Unmasked remove/replace = metadata only", impact: "critical", effort: "medium", dependency: "Mask gate UX" },
  { rank: 6, blocker: "Background remove stores mask but does not inpaint backgroundUrl", impact: "high", effort: "medium", dependency: "Background inpaint pipeline" },
  { rank: 7, blocker: "Brand kit / library drag → importedLayers invisible on main canvas", impact: "high", effort: "medium", dependency: "Compositor" },
  { rank: 8, blocker: "edit_appearance and change_clothing are no-ops or hidden", impact: "high", effort: "low", dependency: "Wire to masked replace or hide" },
  { rank: 9, blocker: "Face not directly selectable", impact: "high", effort: "high", dependency: "Face detection/segmentation" },
  { rank: 10, blocker: "Toolbar save draft = localStorage; pixel edits lost on new device", impact: "high", effort: "medium", dependency: "Server project sync" },
  { rank: 11, blocker: "SAM2 cutout click uses transform center not user click", impact: "medium", effort: "low", dependency: "Precise select flow" },
  { rank: 12, blocker: "Selection outline hidden for approximate layers until selected", impact: "medium", effort: "low", dependency: "editor-selection-outline approximate guard" },
  { rank: 13, blocker: "Server export resizes backgroundUrl — ignores placements unless client export", impact: "medium", effort: "high", dependency: "exportEditorCanvasWithPlacements only for pixel_overlay placements" },
  { rank: 14, blocker: "planEditorSmartRemove.ready true without maskUrl but runMaskedEdit still blocks", impact: "medium", effort: "low", dependency: "Align plan.ready with maskUrl requirement" },
  { rank: 15, blocker: "Mask hit-test uses polygon not raster alpha", impact: "medium", effort: "medium", dependency: "editor-object-picking maskHitTest" },
];

function mockFreshLayer(overrides: Partial<EditorCanvasLayer> = {}): EditorCanvasLayer {
  return {
    id: "layer_test",
    label: "Mascot",
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
    ...overrides,
  };
}

export function freshLayerHasNoMaskUrl(): boolean {
  const layer = mockFreshLayer();
  const replacePlan = planEditorSmartReplace({ layer, prompt: "black jacket" });
  const removePlan = planEditorSmartRemove(layer);
  return !replacePlan.maskUrl && !removePlan.maskUrl;
}

export function runMaskedEditRequiresMaskUrl(): boolean {
  const source = readFileSync(
    join(process.cwd(), "src/components/editor/editor-canvas-workspace.tsx"),
    "utf8"
  );
  return source.includes("if (!maskUrl || !plan.ready)") && source.includes("runMaskedEdit");
}

export function canvasPreviewUsesBackgroundOnly(): boolean {
  const source = readFileSync(join(process.cwd(), "src/components/editor/editor-canvas-preview.tsx"), "utf8");
  return source.includes("document.backgroundUrl") && !source.includes("importedLayers");
}

export function humanFirstHidesUnselectedLayers(): boolean {
  const source = readFileSync(join(process.cwd(), "src/components/editor/editor-canvas-preview.tsx"), "utf8");
  return source.includes("humanFirst && !selected") && source.includes("return null");
}

export function editAppearanceIsNoOp(): boolean {
  const source = readFileSync(
    join(process.cwd(), "src/components/editor/editor-canvas-workspace.tsx"),
    "utf8"
  );
  return source.includes('actionId === "edit_appearance"') && source.includes("setShowActionMenu(false)");
}

export function changeClothingHiddenFromHumanUi(): boolean {
  return actionEditReadiness("change_clothing") === "placeholder";
}

export function computeObjectEditingScore(): ObjectEditingScore {
  const selection = 3;
  const masks = 2;
  const replace = 3;
  const remove = 3;
  const background = 2;
  const insert = 2;
  const persistence = 4;
  const visualFeedback = 3;
  const pixelEditing = 2;
  const overall = Math.round(
    (selection + masks + replace + remove + background + insert + persistence + visualFeedback + pixelEditing) / 9
  );
  return { selection, masks, replace, remove, background, insert, persistence, visualFeedback, pixelEditing, overall };
}

export const MASCOT_USER_JOURNEY = [
  { task: "Change jacket", completable: false, blocker: "No mask on fresh layer; change_clothing placeholder; edit_appearance no-op" },
  { task: "Replace logo", completable: false, blocker: "Need mask + magic replace panel; logo may be placement or approximate bbox" },
  { task: "Remove background", completable: false, blocker: "Segment stores mask on layer; backgroundUrl unchanged on canvas" },
  { task: "Add HomeCheff logo", completable: false, blocker: "Brand kit → importedLayers not rendered; use placement panel instead" },
  { task: "Save", completable: "partial", blocker: "Toolbar draft local only; Review save needed for server" },
  { task: "Reopen", completable: "partial", blocker: "localStorage session; pixel state in backgroundUrl if masked edit succeeded" },
] as const;
