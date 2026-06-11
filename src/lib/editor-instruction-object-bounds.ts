import type {
  EditorInstructionObjectBounds,
  EditorInstructionObjectCategory,
  EditorInstructionObjectV2,
} from "@/types/editor-instruction-studio";
import type { EditorCanvasDocument, EditorCanvasLayer } from "@/types/homecheff-visual-editor";

/** Normalized heuristic bounds for Globe Man mascot (0–1). */
export const GLOBE_MAN_HEURISTIC_BOUNDS: Record<string, EditorInstructionObjectBounds> = {
  Character: { x: 0.22, y: 0.12, width: 0.56, height: 0.78, exact: false },
  "Character / Globe Man": { x: 0.22, y: 0.12, width: 0.56, height: 0.78, exact: false },
  Face: { x: 0.36, y: 0.1, width: 0.28, height: 0.22, exact: false },
  Eyes: { x: 0.38, y: 0.14, width: 0.24, height: 0.1, exact: false },
  Mouth: { x: 0.4, y: 0.22, width: 0.2, height: 0.08, exact: false },
  Jacket: { x: 0.28, y: 0.34, width: 0.44, height: 0.38, exact: false },
  Shirt: { x: 0.32, y: 0.38, width: 0.36, height: 0.22, exact: false },
  "Suit / Clothing": { x: 0.28, y: 0.36, width: 0.44, height: 0.44, exact: false },
  "White lab coat": { x: 0.28, y: 0.34, width: 0.44, height: 0.46, exact: false },
  Tie: { x: 0.42, y: 0.4, width: 0.16, height: 0.14, exact: false },
  Pants: { x: 0.3, y: 0.58, width: 0.4, height: 0.24, exact: false },
  Shoes: { x: 0.28, y: 0.8, width: 0.44, height: 0.14, exact: false },
  Hands: { x: 0.18, y: 0.42, width: 0.64, height: 0.2, exact: false },
  Globe: { x: 0.58, y: 0.2, width: 0.24, height: 0.24, exact: false },
  Logo: { x: 0.34, y: 0.2, width: 0.32, height: 0.18, exact: false },
  Background: { x: 0, y: 0, width: 1, height: 1, exact: false },
};

const CATEGORY_HEURISTIC_BOUNDS: Partial<
  Record<EditorInstructionObjectCategory, EditorInstructionObjectBounds>
> = {
  character: { x: 0.22, y: 0.12, width: 0.56, height: 0.78, exact: false },
  clothing: { x: 0.28, y: 0.36, width: 0.44, height: 0.44, exact: false },
  tool: { x: 0.55, y: 0.18, width: 0.26, height: 0.26, exact: false },
  logo: { x: 0.34, y: 0.2, width: 0.32, height: 0.18, exact: false },
  text: { x: 0.2, y: 0.62, width: 0.6, height: 0.14, exact: false },
  packaging: { x: 0.22, y: 0.28, width: 0.56, height: 0.52, exact: false },
  product: { x: 0.25, y: 0.18, width: 0.5, height: 0.64, exact: false },
  background: { x: 0, y: 0, width: 1, height: 1, exact: false },
  environment: { x: 0, y: 0, width: 1, height: 0.55, exact: false },
  other: { x: 0.2, y: 0.15, width: 0.6, height: 0.7, exact: false },
};

function layerToBounds(layer: EditorCanvasLayer): EditorInstructionObjectBounds {
  return {
    x: layer.bounds.x,
    y: layer.bounds.y,
    width: layer.bounds.width,
    height: layer.bounds.height,
    exact: true,
  };
}

function heuristicByLabel(label: string): EditorInstructionObjectBounds | undefined {
  const direct = GLOBE_MAN_HEURISTIC_BOUNDS[label];
  if (direct) {
    return direct;
  }
  const lower = label.toLowerCase();
  if (/\bface\b/.test(lower)) {
    return GLOBE_MAN_HEURISTIC_BOUNDS.Face;
  }
  if (/^jacket\b|lab coat|labcoat|white coat/.test(lower)) {
    return GLOBE_MAN_HEURISTIC_BOUNDS.Jacket;
  }
  if (/^shirt\b/.test(lower)) {
    return GLOBE_MAN_HEURISTIC_BOUNDS.Shirt;
  }
  if (/^pants\b|trousers/.test(lower)) {
    return GLOBE_MAN_HEURISTIC_BOUNDS.Pants;
  }
  if (/\beyes?\b/.test(lower)) {
    return GLOBE_MAN_HEURISTIC_BOUNDS.Eyes;
  }
  if (/\bmouth\b/.test(lower)) {
    return GLOBE_MAN_HEURISTIC_BOUNDS.Mouth;
  }
  if (/\bhands?\b/.test(lower)) {
    return GLOBE_MAN_HEURISTIC_BOUNDS.Hands;
  }
  if (/\btie\b/.test(lower)) {
    return GLOBE_MAN_HEURISTIC_BOUNDS.Tie;
  }
  if (/shoe|footwear/.test(lower)) {
    return GLOBE_MAN_HEURISTIC_BOUNDS.Shoes;
  }
  if (/\bglobe\b/.test(lower) && !/globe man|globeman/.test(lower)) {
    return GLOBE_MAN_HEURISTIC_BOUNDS.Globe;
  }
  return undefined;
}

export function resolveInstructionObjectBounds(
  object: EditorInstructionObjectV2,
  document: EditorCanvasDocument
): EditorInstructionObjectBounds {
  if (object.bounds) {
    return object.bounds;
  }
  if (object.layerId) {
    const layer = document.objects.find((o) => o.id === object.layerId);
    if (layer && layer.layerType !== "background") {
      return layerToBounds(layer);
    }
  }
  const byLabel = heuristicByLabel(object.label);
  if (byLabel) {
    return byLabel;
  }
  if (object.category === "background") {
    return CATEGORY_HEURISTIC_BOUNDS.background!;
  }
  return (
    CATEGORY_HEURISTIC_BOUNDS[object.category] ?? {
      x: 0.2,
      y: 0.15,
      width: 0.6,
      height: 0.7,
      exact: false,
    }
  );
}

export function attachBoundsToObjects(
  objects: EditorInstructionObjectV2[],
  document: EditorCanvasDocument
): EditorInstructionObjectV2[] {
  return objects.map((obj) => ({
    ...obj,
    bounds: resolveInstructionObjectBounds(obj, document),
  }));
}
