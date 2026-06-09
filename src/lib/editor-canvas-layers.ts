import type { AssetVisionAnalysis } from "@/types/studio-asset-vision-analysis";
import type { EditorCanvasLayer, EditorSourceKind } from "@/types/homecheff-visual-editor";

function isHomeCheffBrand(vision: AssetVisionAnalysis): boolean {
  const brand = `${vision.brandIdentity} ${vision.assetFamily}`.toLowerCase();
  return brand.includes("homecheff") || brand.includes("home cheff");
}

function normalizeFeatureLabel(feature: string, vision: AssetVisionAnalysis): string {
  const lower = feature.toLowerCase();
  const homeCheffOnly = ["globe", "chef hat", "chef attributes", "garden", "designer"].some((t) =>
    lower.includes(t)
  );
  if (homeCheffOnly && !isHomeCheffBrand(vision)) {
    return feature.replace(/chef|garden|designer|globe/gi, "").trim() || feature;
  }
  return feature;
}

export function seedEditorLayersFromVision(params: {
  vision: AssetVisionAnalysis;
  sourceKind: EditorSourceKind;
  preserveBackground?: EditorCanvasLayer;
}): EditorCanvasLayer[] {
  const background =
    params.preserveBackground ??
    ({
      id: "background",
      label: "Background",
      sourceKind: params.sourceKind,
      assetId: null,
      storageKey: "",
      previewUrl: "",
      transform: { x: 0.5, y: 0.5, scale: 1, rotation: 0 },
      locked: true,
      visible: true,
      bounds: { x: 0, y: 0, width: 1, height: 1 },
      layerType: "background",
      confidence: 1,
    } satisfies EditorCanvasLayer);

  const features = params.vision.keyFeatures.length
    ? params.vision.keyFeatures
    : params.vision.suggestedPreserve.length
      ? params.vision.suggestedPreserve
      : ["subject"];

  const semanticLayers = features.slice(0, 12).map((rawFeature, index) => {
    const label = normalizeFeatureLabel(rawFeature, params.vision);
    const row = Math.floor(index / 3);
    const col = index % 3;
    const bounds = {
      x: 0.08 + col * 0.3,
      y: 0.12 + row * 0.18,
      width: 0.26,
      height: 0.14,
    };
    return {
      id: `semantic_${index}_${label.toLowerCase().replace(/\s+/g, "_")}`,
      label,
      sourceKind: params.sourceKind,
      assetId: null,
      storageKey: "",
      previewUrl: "",
      transform: {
        x: bounds.x + bounds.width / 2,
        y: bounds.y + bounds.height / 2,
        scale: 1,
        rotation: 0,
      },
      locked: false,
      visible: true,
      bounds,
      layerType: "semantic" as const,
      confidence: params.vision.confidence,
    };
  });

  return [background, ...semanticLayers];
}

export function visibleEditorLayers(document: { objects: EditorCanvasLayer[] }): EditorCanvasLayer[] {
  return document.objects.filter((layer) => layer.visible);
}
