import { readFileSync } from "node:fs";
import { join } from "node:path";
import { resolveAutoMaskClickPoint } from "@/lib/editor-selection-pipeline";
import { resolveUxV7ObjectActions } from "@/lib/editor-ux-v7-contextual";
import { resolveContextualHumanActions } from "@/lib/editor-ux-cleanup";
import type { EditorCanvasLayer } from "@/types/homecheff-visual-editor";

export type SelectionFixScore = {
  selection: number;
  masking: number;
  visualFeedback: number;
  editing: number;
  userTrust: number;
  overall: number;
};

export const GLOBE_MAN_CLICK_TARGETS = [
  "globe",
  "tie",
  "logo",
  "head",
  "body",
  "background",
] as const;

function mockLayer(overrides: Partial<EditorCanvasLayer> = {}): EditorCanvasLayer {
  return {
    id: "semantic_globe_man",
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
    ...overrides,
  };
}

export function canvasClickUsesUnifiedSelectLayer(): boolean {
  const preview = readFileSync(
    join(process.cwd(), "src/components/editor/editor-canvas-preview.tsx"),
    "utf8"
  );
  return (
    preview.includes("onSelectLayer(hit.layerId") &&
    preview.includes("clickPoint: hit.clickPoint") &&
    !preview.includes("onHierarchicalPick")
  );
}

export function handleHierarchicalPickRemoved(): boolean {
  const workspace = readFileSync(
    join(process.cwd(), "src/components/editor/editor-canvas-workspace.tsx"),
    "utf8"
  );
  return !workspace.includes("const handleHierarchicalPick");
}

export function autoMaskUsesClickPointNotBboxCenter(): boolean {
  const workspace = readFileSync(
    join(process.cwd(), "src/components/editor/editor-canvas-workspace.tsx"),
    "utf8"
  );
  return (
    workspace.includes("resolveAutoMaskClickPoint") &&
    !workspace.includes("layerBoundsCenter(layer)")
  );
}

export function selectionOutlineShowsApproximate(): boolean {
  const outline = readFileSync(
    join(process.cwd(), "src/components/editor/editor-selection-outline.tsx"),
    "utf8"
  );
  return (
    outline.includes("boundsToPolygon(layer.bounds)") &&
    outline.includes("strokeDasharray={approximate") &&
    !outline.includes("showContour = Boolean(contour")
  );
}

export function gatedActionsHideReplaceUntilMask(): boolean {
  const fresh = mockLayer();
  const masked = mockLayer({
    selectionShape: {
      selectionMode: "mask",
      maskUrl: "https://example.com/mask.png",
      boundingBox: { x: 0.22, y: 0.12, width: 0.56, height: 0.78 },
      confidence: 0.9,
      segmentationSource: "sam2",
    },
    metadata: { estimatedBounds: false, approximateSelection: false },
  });
  const freshUx = resolveUxV7ObjectActions(fresh);
  const maskedUx = resolveUxV7ObjectActions(masked);
  const freshHuman = resolveContextualHumanActions(fresh).map((a) => a.id);
  const maskedHuman = resolveContextualHumanActions(masked).map((a) => a.id);
  return (
    freshUx.includes("refine_selection") &&
    !freshUx.includes("replace") &&
    maskedUx.includes("replace") &&
    freshHuman.includes("refine_selection") &&
    !freshHuman.includes("replace") &&
    (maskedHuman.includes("replace") || maskedHuman.includes("remove"))
  );
}

export function clickPointPreferredOverBboxCenter(): boolean {
  const layer = mockLayer();
  const click = { x: 0.55, y: 0.4 };
  const resolved = resolveAutoMaskClickPoint(layer, click);
  return resolved.x === 0.55 && resolved.y === 0.4;
}

export function computeSelectionFixScore(): SelectionFixScore {
  const selection = canvasClickUsesUnifiedSelectLayer() ? 8 : 3;
  const masking = autoMaskUsesClickPointNotBboxCenter() ? 7 : 4;
  const visualFeedback = selectionOutlineShowsApproximate() ? 7 : 4;
  const editing = gatedActionsHideReplaceUntilMask() ? 8 : 4;
  const userTrust = handleHierarchicalPickRemoved() && gatedActionsHideReplaceUntilMask() ? 7 : 4;
  const overall = Math.round((selection + masking + visualFeedback + editing + userTrust) / 5);
  return { selection, masking, visualFeedback, editing, userTrust, overall };
}
