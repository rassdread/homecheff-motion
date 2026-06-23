/** Brand Asset Protection Layer — protected logos, marks, labels, and icons. */

import type { EditorFusionIntent } from "@/types/editor-instruction-studio";

export const BRAND_ASSET_TYPES = [
  "logo",
  "icon",
  "label",
  "mascot_mark",
  "text_logo",
] as const;

export type ProtectedBrandAssetType = (typeof BRAND_ASSET_TYPES)[number];

export const BRAND_ASSET_PRESERVE_MODES = [
  "prompt_only",
  "reference_asset",
  "post_composite",
] as const;

export type BrandAssetPreserveMode = (typeof BRAND_ASSET_PRESERVE_MODES)[number];

export const BRAND_ASSET_ALLOWED_TRANSFORMS = [
  "scale",
  "rotate",
  "perspective",
  "perspective_transform",
  "shadow",
  "blend",
] as const;

export type BrandAssetAllowedTransform = (typeof BRAND_ASSET_ALLOWED_TRANSFORMS)[number];

export const BRAND_ASSET_FORBIDDEN_TRANSFORMS = [
  "redraw",
  "rewrite_text",
  "change_colors",
  "simplify",
  "simplify_logo",
  "hallucinate",
] as const;

export type BrandAssetForbiddenTransform = (typeof BRAND_ASSET_FORBIDDEN_TRANSFORMS)[number];

export type BrandAssetBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
  exact?: boolean;
};

export type BrandAssetQuad = {
  topLeft: { x: number; y: number };
  topRight: { x: number; y: number };
  bottomRight: { x: number; y: number };
  bottomLeft: { x: number; y: number };
};

export const BRAND_PLACEMENT_SURFACE_TYPES = [
  "shirt",
  "packaging",
  "billboard",
  "poster",
  "vehicle",
  "wall",
  "signage",
  "mug",
  "cup",
  "product_label",
] as const;

export type BrandPlacementSurfaceType = (typeof BRAND_PLACEMENT_SURFACE_TYPES)[number];

export const BRAND_SURFACE_SHAPES = ["flat", "curved", "complex"] as const;

export type BrandSurfaceShape = (typeof BRAND_SURFACE_SHAPES)[number];

export const LOGO_PLACEMENT_MODES = ["fit_to_target", "perspective_warp"] as const;

export type LogoPlacementMode = (typeof LOGO_PLACEMENT_MODES)[number];

export const QUAD_GENERATION_SOURCES = [
  "polygon",
  "mask",
  "vision_contour",
  "bbox",
  "user",
] as const;

export type QuadGenerationSource = (typeof QUAD_GENERATION_SOURCES)[number];

/** Placeholder for future curved-surface mesh warping (Sprint D+). */
export type BrandCurveMeshPlaceholder = {
  enabled: false;
  meshRows?: number;
  meshCols?: number;
};

export type ProtectedBrandAsset = {
  id: string;
  assetType: ProtectedBrandAssetType;
  sourceUrl: string;
  originalBounds?: BrandAssetBounds;
  targetBounds?: BrandAssetBounds;
  quad?: BrandAssetQuad;
  surfaceType?: BrandPlacementSurfaceType;
  surfaceShape?: BrandSurfaceShape;
  placementMode?: LogoPlacementMode;
  preserveMode: BrandAssetPreserveMode;
  mustRemainExact: boolean;
  allowedTransforms: BrandAssetAllowedTransform[];
  forbiddenTransforms: BrandAssetForbiddenTransform[];
  label?: string;
  detectedFrom?: "vision" | "reference" | "upload" | "registry";
  quadSource?: QuadGenerationSource;
  curveMesh?: BrandCurveMeshPlaceholder;
};

export type LogoPlacementBlueprint = {
  targetObjectId: string;
  targetLabel: string;
  targetBounds: BrandAssetBounds;
  quad?: BrandAssetQuad;
  logoAssetUrl: string;
  preserveLogoExact: boolean;
  placementMode: LogoPlacementMode;
  surfaceType?: BrandPlacementSurfaceType;
  surfaceShape?: BrandSurfaceShape;
  quadSource?: QuadGenerationSource;
  perspective: "match_target" | "flat";
  lighting: "match_scene";
  shadow: "natural" | "none";
  curveMesh?: BrandCurveMeshPlaceholder;
  /** Sprint K — vision hierarchy linkage (single source of truth for motion). */
  hierarchyNodeId?: string;
  partId?: string;
  normalizedTargetKey?: string;
  additionalPlacementTargets?: Array<{
    targetObjectId: string;
    targetLabel: string;
    targetBounds: BrandAssetBounds;
    quad?: BrandAssetQuad;
    hierarchyNodeId?: string;
    partId?: string;
    normalizedTargetKey?: string;
  }>;
};

export const POST_COMPOSITE_FIT_MODES = ["contain", "cover"] as const;

export type PostCompositeFitMode = (typeof POST_COMPOSITE_FIT_MODES)[number];

export type PostCompositePixelBounds = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type PostCompositeOverlayPlan = {
  assetId: string;
  sourceUrl: string;
  label?: string;
  normalizedBounds: BrandAssetBounds;
  pixelBounds: PostCompositePixelBounds;
  quad?: BrandAssetQuad;
  pixelQuad?: BrandAssetQuad;
  placementMode: LogoPlacementMode;
  surfaceType?: BrandPlacementSurfaceType;
  surfaceShape?: BrandSurfaceShape;
  quadSource?: QuadGenerationSource;
  sourceImageWidth: number;
  sourceImageHeight: number;
  outputImageWidth: number;
  outputImageHeight: number;
  fitMode: PostCompositeFitMode;
  opacity: number;
  rotationDeg: number;
  perspectiveWarpApplied?: boolean;
  curveMesh?: BrandCurveMeshPlaceholder;
};

export type PostCompositeApplyResult = {
  buffer: Buffer;
  applied: boolean;
  appliedAssetIds: string[];
  skippedAssetIds: string[];
  warnings: string[];
  perspectiveWarpApplied?: boolean;
  perspectiveWarpAssetIds?: string[];
};

export type BrandAssetProtectionLog = {
  protectedBrandAssetsCount: number;
  protectionModesUsed: BrandAssetPreserveMode[];
  postCompositeApplied: boolean;
  postCompositeAssetCount?: number;
  postCompositeAppliedAssetIds?: string[];
  perspectiveWarpApplied?: boolean;
  perspectiveWarpAssetIds?: string[];
  surfaceType?: BrandPlacementSurfaceType;
  quadGenerated?: boolean;
  quadSource?: QuadGenerationSource;
  quadUsed?: boolean;
  validationPassed: boolean;
  validationWarnings: string[];
};

export type BrandAssetProtectionResult = {
  assets: ProtectedBrandAsset[];
  active: boolean;
  preserveLogoExact: boolean;
  renderInstructions: string[];
  promptRules: string[];
  postCompositeAssets: ProtectedBrandAsset[];
  referenceAssets: ProtectedBrandAsset[];
  overlayPlans: PostCompositeOverlayPlan[];
  log: BrandAssetProtectionLog;
};

/** Sprint E — motion handoff lock payload (derived from ProtectedBrandAsset only). */
export const BRAND_MOTION_LOCK_TRACKING_MODES = [
  "static",
  "affine_segment",
  "perspective_segment",
  "mesh_placeholder",
] as const;

export type BrandMotionLockTrackingMode = (typeof BRAND_MOTION_LOCK_TRACKING_MODES)[number];

export const BRAND_MOTION_LOCK_VALIDATION_MODES = [
  "prompt_only",
  "keyframe_bake",
  "post_composite",
] as const;

export type BrandMotionLockValidationMode = (typeof BRAND_MOTION_LOCK_VALIDATION_MODES)[number];

export type BrandLockedAsset = {
  assetId: string;
  assetUrl: string;
  motionLocked: boolean;
  preserveExact: boolean;
  preserveMode: BrandAssetPreserveMode;
  targetObjectId?: string;
  targetBounds?: BrandAssetBounds;
  quad?: BrandAssetQuad;
  /** Sprint K — same vision target as LogoPlacementBlueprint (no zone conversion). */
  hierarchyNodeId?: string;
  partId?: string;
  normalizedTargetKey?: string;
  placementMode?: LogoPlacementMode;
  surfaceType?: BrandPlacementSurfaceType;
  surfaceShape?: BrandSurfaceShape;
  quadSource?: QuadGenerationSource;
  trackingMode: BrandMotionLockTrackingMode;
  validationMode: BrandMotionLockValidationMode;
  sceneId?: string;
  segmentIndex?: number;
  keyframeRole?: "start" | "middle" | "end";
};

export type BrandMotionLockLog = {
  assetsLocked: number;
  trackingModesUsed: string[];
  validationModesUsed: string[];
  quadSourcesUsed: string[];
};

/** Sprint F — keyframe baking input (derived from BrandLockedAsset, no field loss). */
export type MotionKeyframeBrandAsset = {
  assetId: string;
  assetUrl: string;
  preserveExact: boolean;
  preserveMode: BrandAssetPreserveMode;
  validationMode: BrandMotionLockValidationMode;
  targetObjectId?: string;
  targetBounds?: BrandAssetBounds;
  quad?: BrandAssetQuad;
  placementMode?: LogoPlacementMode;
  surfaceType?: BrandPlacementSurfaceType;
  surfaceShape?: BrandSurfaceShape;
  quadSource?: QuadGenerationSource;
  sceneId?: string;
  segmentIndex?: number;
  keyframeRole?: "start" | "middle" | "end";
};

export type MotionKeyframeBrandProtectionLog = {
  assetsLocked: number;
  keyframesProcessed: number;
  perspectiveWarpApplied: boolean;
  postCompositeApplied: boolean;
  appliedAssetIds: string[];
  skippedAssetIds: string[];
  warnings: string[];
};

export type MotionProjectKeyframeBrandLog = {
  brandLockedAssets: number;
  keyframeBrandProtectionApplied: boolean;
};

export type BrandAssetProtectionInput = {
  workflowType: EditorFusionIntent | "logo_placement" | "mascot_transform";
  logoAssets?: Array<{ referenceId: string; url: string; name?: string }>;
  profiles?: Array<{
    referenceId: string;
    imageUrl: string;
    name?: string;
    parts?: Array<{ id: string; label: string; category: string }>;
    identityTraits?: string[];
  }>;
  generationSettings?: Record<string, unknown>;
  logoPlacement?: LogoPlacementBlueprint | null;
  mascotPreserveLogo?: boolean;
  userPreserveLogoExact?: boolean;
  /** Sprint D.1 — vision polygon/mask quad for product_branding fusion renders. */
  productBrandingLogoGeometry?: ProductBrandingLogoGeometry | null;
};

export type BrandAssetPostRenderValidation = {
  passed: boolean;
  warnings: string[];
  missingAssetIds: string[];
  recoverableViaPostComposite: boolean;
  perspectiveWarpApplied?: boolean;
  quadUsed?: boolean;
};

/** Vision-derived logo placement for product_branding (Sprint D.1). */
export type ProductBrandingLogoGeometry = {
  targetObjectId: string;
  targetLabel: string;
  bounds: BrandAssetBounds;
  quad: BrandAssetQuad;
  quadSource: QuadGenerationSource;
  placementMode: LogoPlacementMode;
  surfaceType: BrandPlacementSurfaceType;
  surfaceShape: BrandSurfaceShape;
  hasPolygon: boolean;
  hasMask: boolean;
};
