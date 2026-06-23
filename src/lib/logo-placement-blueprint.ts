/**
 * Logo placement blueprint — vision-targeted exact logo placement with perspective quads.
 */

import { generatePlacementQuad } from "@/lib/brand-asset-quad-generator";
import { resolveInstructionObjectBounds } from "@/lib/editor-instruction-object-bounds";
import { listInstructionObjectsV2 } from "@/lib/editor-instruction-object-v2";
import { resolveEditorSelectionGeometry } from "@/lib/editor-mask-first";
import type { EditorInstructionObjectBounds, EditorInstructionObjectV2 } from "@/types/editor-instruction-studio";
import type {
  BrandAssetBounds,
  BrandAssetQuad,
  LogoPlacementBlueprint,
  LogoPlacementMode,
  ProductBrandingLogoGeometry,
} from "@/types/brand-asset-protection";
import type { BrandReferenceAsset } from "@/types/editor-instruction-studio";
import type { EditorFusionPlan } from "@/types/editor-instruction-studio";
import type { EditorCanvasDocument, EditorCanvasLayer } from "@/types/homecheff-visual-editor";
import { createBrandReferenceId } from "@/lib/editor-instruction-references";

export function objectBoundsToBrandBounds(bounds: EditorInstructionObjectBounds): BrandAssetBounds {
  return {
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    exact: bounds.exact,
  };
}

export function resolveLogoPlacementGeometry(
  document: EditorCanvasDocument,
  targetObject: Pick<EditorInstructionObjectV2, "id" | "label" | "bounds"> & {
    layerId?: string;
    category?: EditorInstructionObjectV2["category"];
  }
): {
  bounds: BrandAssetBounds;
  polygon?: { x: number; y: number }[];
  maskUrl?: string;
} {
  const layer = targetObject.layerId
    ? document.objects.find((entry) => entry.id === targetObject.layerId) ?? null
    : document.objects.find((entry) => entry.id === targetObject.id) ?? null;
  const editorObject = document.detectedObjects?.find(
    (entry) => entry.id === targetObject.id || entry.id === targetObject.layerId
  );

  const geometry = resolveEditorSelectionGeometry(layer, editorObject ?? null);
  const bounds = objectBoundsToBrandBounds(
    targetObject.bounds
      ? targetObject.bounds
      : {
          x: geometry.bbox.x,
          y: geometry.bbox.y,
          width: geometry.bbox.width,
          height: geometry.bbox.height,
          exact: geometry.priority !== "bbox",
        }
  );

  return {
    bounds,
    polygon: geometry.polygon,
    maskUrl: geometry.maskUrl,
  };
}

export function buildLogoPlacementBlueprint(input: {
  targetObject: Pick<EditorInstructionObjectV2, "id" | "label" | "bounds"> & {
    layerId?: string;
    category?: EditorInstructionObjectV2["category"];
  };
  logoAssetUrl: string;
  preserveLogoExact?: boolean;
  perspective?: LogoPlacementBlueprint["perspective"];
  shadow?: LogoPlacementBlueprint["shadow"];
  placementMode?: LogoPlacementMode;
  quad?: BrandAssetQuad;
  document?: EditorCanvasDocument;
}): LogoPlacementBlueprint {
  const geometry = input.document
    ? resolveLogoPlacementGeometry(input.document, input.targetObject)
    : {
        bounds: objectBoundsToBrandBounds(
          input.targetObject.bounds ?? {
            x: 0.25,
            y: 0.25,
            width: 0.5,
            height: 0.5,
            exact: false,
          }
        ),
      };

  const quadResult = input.quad
    ? {
        quad: input.quad,
        source: "user" as const,
        surfaceType: undefined,
        surfaceShape: undefined,
        placementMode: input.placementMode ?? ("perspective_warp" as const),
      }
    : generatePlacementQuad({
        bbox: geometry.bounds,
        polygon: geometry.polygon,
        maskUrl: geometry.maskUrl,
        objectCategory: input.targetObject.category,
        objectLabel: input.targetObject.label,
        placementMode: input.placementMode,
      });

  return {
    targetObjectId: input.targetObject.id,
    targetLabel: input.targetObject.label,
    targetBounds: geometry.bounds,
    quad: quadResult.quad,
    logoAssetUrl: input.logoAssetUrl.trim(),
    preserveLogoExact: input.preserveLogoExact ?? true,
    placementMode: quadResult.placementMode,
    surfaceType: quadResult.surfaceType,
    surfaceShape: quadResult.surfaceShape,
    quadSource: quadResult.source,
    perspective: input.perspective ?? "match_target",
    lighting: "match_scene",
    shadow: input.shadow ?? "natural",
    curveMesh: { enabled: false },
  };
}

export function buildLogoPlacementFusionPlanPatch(
  blueprint: LogoPlacementBlueprint
): Partial<EditorFusionPlan> {
  return {
    intent: "product_branding",
    generationSettings: {
      preserveLogoExact: blueprint.preserveLogoExact,
      position: "custom",
      perspective: blueprint.perspective === "match_target" ? "perspective" : "flat",
      backgroundProtection: true,
      logoPlacementTargetId: blueprint.targetObjectId,
      logoPlacementTargetLabel: blueprint.targetLabel,
      logoPlacementMode: blueprint.placementMode,
      logoPlacementSurfaceType: blueprint.surfaceType,
    },
    references: [
      {
        id: createBrandReferenceId(),
        type: "logo",
        url: blueprint.logoAssetUrl,
        name: "Uploaded logo",
        uploadedAt: new Date().toISOString(),
      },
    ],
    brandRules: [
      `Place logo on ${blueprint.targetLabel} within detected bounds.`,
      "Use uploaded logo asset exactly — do not redraw.",
      blueprint.placementMode === "perspective_warp"
        ? "Leave perspective placement area clear for post-composite warp."
        : "Leave flat placement area clear for post-composite.",
      blueprint.preserveLogoExact
        ? "Logo must remain pixel-faithful; post-composite if needed."
        : "Match logo style to scene lighting.",
    ],
  };
}

export function logoPlacementRenderInstructions(blueprint: LogoPlacementBlueprint): string[] {
  const b = blueprint.targetBounds;
  return [
    `Place uploaded logo on "${blueprint.targetLabel}" (${blueprint.targetObjectId}).`,
    `Target area: x=${b.x.toFixed(3)}, y=${b.y.toFixed(3)}, w=${b.width.toFixed(3)}, h=${b.height.toFixed(3)}.`,
    blueprint.placementMode === "perspective_warp"
      ? "Match surface perspective — logo will be warped from original asset after render."
      : blueprint.perspective === "match_target"
        ? "Match surface perspective and lighting."
        : "Keep logo flat on surface.",
    blueprint.shadow === "natural" ? "Add natural contact shadow." : "No added shadow.",
    blueprint.preserveLogoExact
      ? "Preserve logo exactly — use reference asset, do not redraw text or colors."
      : "Blend logo with scene while keeping brand identity.",
  ];
}

export function logoPlacementFromBrandReference(
  targetObject: Pick<EditorInstructionObjectV2, "id" | "label" | "bounds">,
  logo: BrandReferenceAsset
): LogoPlacementBlueprint {
  return buildLogoPlacementBlueprint({
    targetObject,
    logoAssetUrl: logo.url,
    preserveLogoExact: true,
  });
}

export function objectSupportsLogoPlacement(obj: EditorInstructionObjectV2): boolean {
  const brandingCategories = new Set([
    "clothing",
    "packaging",
    "product",
    "vehicle",
    "building",
    "signage",
    "logo",
  ]);
  return brandingCategories.has(obj.category);
}

type ProductBrandingPlacementTarget = Pick<
  EditorInstructionObjectV2,
  "id" | "label" | "bounds"
> & {
  layerId?: string;
  category?: EditorInstructionObjectV2["category"];
};

const BRANDING_CATEGORY_PRIORITY: Partial<Record<EditorInstructionObjectV2["category"], number>> = {
  product: 50,
  packaging: 45,
  clothing: 40,
  vehicle: 35,
  signage: 30,
  building: 25,
  logo: 10,
};

function scorePlacementTarget(
  document: EditorCanvasDocument,
  target: ProductBrandingPlacementTarget
): number {
  const geometry = resolveLogoPlacementGeometry(document, target);
  let score = BRANDING_CATEGORY_PRIORITY[target.category ?? "other"] ?? 0;
  if (geometry.polygon && geometry.polygon.length >= 3) {
    score += 100;
  }
  if (geometry.maskUrl?.trim()) {
    score += 80;
  }
  if (geometry.bounds.exact) {
    score += 5;
  }
  return score;
}

function inferLayerCategory(layer: EditorCanvasLayer): EditorInstructionObjectV2["category"] {
  const text = `${layer.semanticType ?? ""} ${layer.category ?? ""} ${layer.metadata?.taxonomyKey ?? ""}`.toLowerCase();
  if (/packaging|carton|box|verpak/.test(text)) {
    return "packaging";
  }
  if (/shirt|clothing|jacket|apron|hoodie/.test(text)) {
    return "clothing";
  }
  if (/vehicle|van|car|truck/.test(text)) {
    return "vehicle";
  }
  if (/signage|sign\b|billboard/.test(text)) {
    return "signage";
  }
  if (/product|bottle|mug|cup|label/.test(text)) {
    return "product";
  }
  return "product";
}

function layerToPlacementTarget(layer: EditorCanvasLayer): ProductBrandingPlacementTarget {
  return {
    id: layer.id,
    label: layer.label || layer.semanticType || "Product",
    category: inferLayerCategory(layer),
    layerId: layer.id,
    bounds: {
      x: layer.bounds.x,
      y: layer.bounds.y,
      width: layer.bounds.width,
      height: layer.bounds.height,
      exact: Boolean(layer.selectionShape?.polygon?.length || layer.selectionShape?.maskUrl),
    },
  };
}

function findBestBrandingLayer(document: EditorCanvasDocument): EditorCanvasLayer | null {
  const layers = document.objects.filter(
    (layer) => layer.layerType !== "background" && layer.layerType !== "overlay"
  );
  let best: EditorCanvasLayer | null = null;
  let bestScore = -1;
  for (const layer of layers) {
    const target = layerToPlacementTarget(layer);
    const score = scorePlacementTarget(document, target);
    if (score > bestScore) {
      bestScore = score;
      best = layer;
    }
  }
  return bestScore > 0 ? best : layers[0] ?? null;
}

export function resolveProductBrandingPlacementTarget(
  document: EditorCanvasDocument,
  generationSettings?: Record<string, unknown>
): ProductBrandingPlacementTarget | null {
  const targetId =
    typeof generationSettings?.logoPlacementTargetId === "string"
      ? generationSettings.logoPlacementTargetId
      : undefined;

  const candidates = listInstructionObjectsV2(document)
    .filter(objectSupportsLogoPlacement)
    .map((object) => ({
      ...object,
      bounds: object.bounds ?? resolveInstructionObjectBounds(object, document),
    }));

  if (targetId) {
    const match = candidates.find((object) => object.id === targetId);
    if (match) {
      return match;
    }
  }

  let best: ProductBrandingPlacementTarget | null = null;
  let bestScore = -1;
  for (const candidate of candidates) {
    const score = scorePlacementTarget(document, candidate);
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }
  if (best) {
    return best;
  }

  const layer = findBestBrandingLayer(document);
  return layer ? layerToPlacementTarget(layer) : null;
}

export function resolveProductBrandingLogoGeometry(
  document: EditorCanvasDocument,
  generationSettings?: Record<string, unknown>
): ProductBrandingLogoGeometry | null {
  const target = resolveProductBrandingPlacementTarget(document, generationSettings);
  if (!target) {
    return null;
  }

  const geometry = resolveLogoPlacementGeometry(document, target);
  const perspectiveSetting = generationSettings?.perspective;
  const placementModeOverride =
    generationSettings?.logoPlacementMode === "perspective_warp" ||
    generationSettings?.logoPlacementMode === "fit_to_target"
      ? generationSettings.logoPlacementMode
      : perspectiveSetting === "perspective"
        ? ("perspective_warp" as const)
        : undefined;

  const quadResult = generatePlacementQuad({
    bbox: geometry.bounds,
    polygon: geometry.polygon,
    maskUrl: geometry.maskUrl,
    objectCategory: target.category,
    objectLabel: target.label,
    placementMode: placementModeOverride,
    surfaceType:
      typeof generationSettings?.logoPlacementSurfaceType === "string"
        ? (generationSettings.logoPlacementSurfaceType as ProductBrandingLogoGeometry["surfaceType"])
        : undefined,
  });

  return {
    targetObjectId: target.id,
    targetLabel: target.label,
    bounds: geometry.bounds,
    quad: quadResult.quad,
    quadSource: quadResult.source,
    placementMode: quadResult.placementMode,
    surfaceType: quadResult.surfaceType,
    surfaceShape: quadResult.surfaceShape,
    hasPolygon: Boolean(geometry.polygon && geometry.polygon.length >= 3),
    hasMask: Boolean(geometry.maskUrl?.trim()),
  };
}
