import { classifyEditorSemanticFeature } from "@/lib/editor-semantic-layer-taxonomy";
import type { AssetVisionAnalysis } from "@/types/studio-asset-vision-analysis";
import type {
  EditorCanvasBounds,
  EditorSemanticLayer,
  EditorSemanticLayerCategory,
  EditorSourceKind,
} from "@/types/homecheff-visual-editor";

export type BrandSheetRegion = {
  label: string;
  type: string;
  category: EditorSemanticLayerCategory;
  bounds: EditorCanvasBounds;
};

/** Selectable regions for poster / brand-sheet layouts (normalized bounds). */
export const BRAND_SHEET_REGIONS: BrandSheetRegion[] = [
  { label: "Logo", type: "logo", category: "logo", bounds: { x: 0.04, y: 0.03, width: 0.42, height: 0.22 } },
  {
    label: "Globe Man",
    type: "character",
    category: "character",
    bounds: { x: 0.52, y: 0.04, width: 0.44, height: 0.38 },
  },
  { label: "Tekst", type: "text", category: "text", bounds: { x: 0.04, y: 0.28, width: 0.92, height: 0.14 } },
  {
    label: "Kleurenkaart",
    type: "brand_color_area",
    category: "brand_element",
    bounds: { x: 0.04, y: 0.46, width: 0.3, height: 0.2 },
  },
  { label: "Icoon", type: "mark", category: "logo", bounds: { x: 0.38, y: 0.46, width: 0.24, height: 0.2 } },
  { label: "Banner", type: "poster", category: "brand_element", bounds: { x: 0.66, y: 0.44, width: 0.3, height: 0.22 } },
  {
    label: "Product",
    type: "product_body",
    category: "product",
    bounds: { x: 0.04, y: 0.7, width: 0.44, height: 0.26 },
  },
  {
    label: "Afbeelding",
    type: "object",
    category: "prop",
    bounds: { x: 0.52, y: 0.68, width: 0.44, height: 0.28 },
  },
];

const BRAND_SHEET_NAME_PATTERN =
  /brand|sheet|poster|flyer|banner|layout|homecheff|guideline|styleguide|mockup/i;

export function isBrandSheetLayout(input: {
  name: string;
  vision?: AssetVisionAnalysis | null;
  featureCount?: number;
}): boolean {
  const name = input.name.toLowerCase();
  if (BRAND_SHEET_NAME_PATTERN.test(name)) {
    return true;
  }
  const visionType = input.vision?.objectType;
  if (
    visionType === "brand_asset" ||
    visionType === "illustration" ||
    visionType === "logo" ||
    visionType === "ui_asset"
  ) {
    const features = input.vision?.keyFeatures?.length ?? 0;
    if (features >= 4) {
      return true;
    }
  }
  const brand = `${input.vision?.brandIdentity ?? ""} ${input.vision?.assetFamily ?? ""}`.toLowerCase();
  if (brand.includes("homecheff") && (input.featureCount ?? 0) >= 3) {
    return true;
  }
  if ((input.vision?.keyFeatures?.length ?? 0) >= 8) {
    return true;
  }
  return false;
}

export function buildBrandSheetSemanticLayers(input: {
  vision?: AssetVisionAnalysis | null;
  sourceKind: EditorSourceKind;
}): EditorSemanticLayer[] {
  const confidence = input.vision?.confidence ?? 0.72;
  const layers: EditorSemanticLayer[] = BRAND_SHEET_REGIONS.map((region, index) => {
    const classified = classifyEditorSemanticFeature(region.label, input.vision?.objectType ?? "unknown");
    return {
      id: `brand_sheet_${index}_${region.type}`,
      label: region.label,
      type: region.type,
      category: region.category,
      bounds: region.bounds,
      confidence: confidence * 0.9,
      visible: true,
      locked: false,
      editable: true,
      source: "vision",
      children: [],
      metadata: {
        taxonomyKey: classified.type,
        estimatedBounds: true,
        approximateSelection: true,
        selectionMode: "box",
        bootstrapRegion: true,
        rawFeature: "brand_sheet",
      },
    };
  });

  layers.unshift({
    id: "semantic_background",
    label: "Background",
    type: "background",
    category: "background",
    bounds: { x: 0, y: 0, width: 1, height: 1 },
    confidence: 1,
    visible: true,
    locked: true,
    editable: false,
    source: "vision",
    children: [],
    metadata: { taxonomyKey: "background" },
  });

  return layers;
}
