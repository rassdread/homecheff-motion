/**
 * Vision audit — which workflows expose polygon/mask geometry for quad generation.
 */

import type { BrandPlacementSurfaceType } from "@/types/brand-asset-protection";

export type BrandVisionGeometryCapability = {
  workflow: string;
  hasPolygon: boolean;
  hasMask: boolean;
  hasBboxOnly: boolean;
  canAutoGenerateQuad: boolean;
  typicalSurface: BrandPlacementSurfaceType;
  notes: string;
};

export const BRAND_ASSET_VISION_AUDIT: BrandVisionGeometryCapability[] = [
  {
    workflow: "logo_placement",
    hasPolygon: true,
    hasMask: true,
    hasBboxOnly: true,
    canAutoGenerateQuad: true,
    typicalSurface: "shirt",
    notes:
      "SAM2/rembg masks and selectionShape.polygon on canvas layers; instruction objects link via layerId.",
  },
  {
    workflow: "product_branding",
    hasPolygon: true,
    hasMask: true,
    hasBboxOnly: true,
    canAutoGenerateQuad: true,
    typicalSurface: "product_label",
    notes:
      "Wired via resolveProductBrandingLogoGeometry in buildFusionRenderPayload — consumes selectionShape.polygon and maskUrl from document layers.",
  },
  {
    workflow: "product_packaging",
    hasPolygon: true,
    hasMask: true,
    hasBboxOnly: true,
    canAutoGenerateQuad: true,
    typicalSurface: "packaging",
    notes: "Vision layers on package faces; mask-first when user segments packaging.",
  },
  {
    workflow: "campaign_variant",
    hasPolygon: true,
    hasMask: true,
    hasBboxOnly: true,
    canAutoGenerateQuad: true,
    typicalSurface: "billboard",
    notes: "Billboard/poster layers often have polygon from vision_estimate or SAM2.",
  },
  {
    workflow: "product_environment",
    hasPolygon: false,
    hasMask: false,
    hasBboxOnly: true,
    canAutoGenerateQuad: true,
    typicalSurface: "wall",
    notes: "Environment shots — bbox fallback with flat quad.",
  },
  {
    workflow: "outfit_from_reference",
    hasPolygon: true,
    hasMask: true,
    hasBboxOnly: true,
    canAutoGenerateQuad: true,
    typicalSurface: "shirt",
    notes: "Clothing parts from vision profiles; shirt panels benefit from perspective warp.",
  },
  {
    workflow: "mascot_transform",
    hasPolygon: true,
    hasMask: false,
    hasBboxOnly: true,
    canAutoGenerateQuad: false,
    typicalSurface: "product_label",
    notes: "Marks protected via reference_asset; quad rarely needed.",
  },
];

export function visionAuditForWorkflow(workflow: string): BrandVisionGeometryCapability | undefined {
  return BRAND_ASSET_VISION_AUDIT.find((entry) => entry.workflow === workflow);
}

export function workflowCanAutoGenerateQuad(workflow: string): boolean {
  return visionAuditForWorkflow(workflow)?.canAutoGenerateQuad ?? false;
}
