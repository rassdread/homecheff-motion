/**
 * Brand Asset Protection Layer — detect, protect, validate brand marks across workflows.
 */

import type { EditorFusionIntent } from "@/types/editor-instruction-studio";
import type {
  BrandAssetBounds,
  BrandAssetPostRenderValidation,
  BrandAssetPreserveMode,
  BrandAssetProtectionInput,
  BrandAssetProtectionLog,
  BrandAssetProtectionResult,
  LogoPlacementBlueprint,
  PostCompositeOverlayPlan,
  ProductBrandingLogoGeometry,
  ProtectedBrandAsset,
  ProtectedBrandAssetType,
} from "@/types/brand-asset-protection";
import { defaultLogoPlacementBounds } from "@/lib/brand-asset-post-composite-plan";
import { generatePlacementQuad } from "@/lib/brand-asset-quad-generator";

const LOGO_LABEL_PATTERN =
  /\b(logo|globe|homecheff|home.?chef|home.?garden|home.?designer|brand\s*mark|emblem|mascot\s*mark|sponsor)\b/i;

const LABEL_PATTERN = /\b(label|packaging|badge|sticker|tag)\b/i;

const DEFAULT_FORBIDDEN = [
  "redraw",
  "rewrite_text",
  "change_colors",
  "simplify",
  "simplify_logo",
  "hallucinate",
] as const;

const DEFAULT_ALLOWED = [
  "scale",
  "rotate",
  "perspective",
  "perspective_transform",
  "shadow",
  "blend",
] as const;

export const BRAND_PROTECTION_PROMPT_RULES = [
  "Do not redraw protected brand assets.",
  "Do not alter logo text.",
  "Do not change logo colors.",
  "Preserve protected brand assets exactly.",
  "If exact preservation is not possible, leave a clean empty placement area for post-composite.",
] as const;

const POST_COMPOSITE_WORKFLOWS = new Set<string>([
  "product_branding",
  "logo_placement",
]);

const REFERENCE_ASSET_WORKFLOWS = new Set<string>([
  "outfit_from_reference",
  "person_outfit",
  "mascot_into_human",
  "human_into_mascot",
  "character_upgrade",
  "mascot_transform",
]);

function createProtectedAsset(input: {
  id: string;
  assetType: ProtectedBrandAssetType;
  sourceUrl: string;
  preserveMode: BrandAssetPreserveMode;
  label?: string;
  originalBounds?: BrandAssetBounds;
  targetBounds?: BrandAssetBounds;
  quad?: import("@/types/brand-asset-protection").BrandAssetQuad;
  surfaceType?: import("@/types/brand-asset-protection").BrandPlacementSurfaceType;
  surfaceShape?: import("@/types/brand-asset-protection").BrandSurfaceShape;
  placementMode?: import("@/types/brand-asset-protection").LogoPlacementMode;
  quadSource?: import("@/types/brand-asset-protection").QuadGenerationSource;
  detectedFrom?: ProtectedBrandAsset["detectedFrom"];
  mustRemainExact?: boolean;
}): ProtectedBrandAsset {
  return {
    id: input.id,
    assetType: input.assetType,
    sourceUrl: input.sourceUrl,
    originalBounds: input.originalBounds,
    targetBounds: input.targetBounds,
    quad: input.quad,
    surfaceType: input.surfaceType,
    surfaceShape: input.surfaceShape,
    placementMode: input.placementMode,
    quadSource: input.quadSource,
    curveMesh: { enabled: false },
    preserveMode: input.preserveMode,
    mustRemainExact: input.mustRemainExact ?? true,
    allowedTransforms: [...DEFAULT_ALLOWED],
    forbiddenTransforms: [...DEFAULT_FORBIDDEN],
    label: input.label,
    detectedFrom: input.detectedFrom,
  };
}

export function resolveDefaultPreserveMode(
  workflowType: BrandAssetProtectionInput["workflowType"],
  assetType: ProtectedBrandAssetType,
  options?: { userPreserveLogoExact?: boolean; hasText?: boolean; isSmall?: boolean }
): BrandAssetPreserveMode {
  if (options?.userPreserveLogoExact === false) {
    return assetType === "label" ? "prompt_only" : "reference_asset";
  }

  if (POST_COMPOSITE_WORKFLOWS.has(workflowType)) {
    return "post_composite";
  }

  if (workflowType === "product_packaging" || workflowType === "product_branding") {
    return "post_composite";
  }

  if (workflowType === "mascot_transform" || REFERENCE_ASSET_WORKFLOWS.has(workflowType)) {
    if (assetType === "text_logo" || options?.hasText || options?.isSmall) {
      return "post_composite";
    }
    return "reference_asset";
  }

  if (assetType === "logo" || assetType === "text_logo") {
    return "post_composite";
  }

  return "prompt_only";
}

function inferAssetType(label: string, category?: string): ProtectedBrandAssetType {
  const combined = `${label} ${category ?? ""}`;
  if (/text\s*logo|wordmark|typography/i.test(combined)) {
    return "text_logo";
  }
  if (LABEL_PATTERN.test(combined)) {
    return "label";
  }
  if (/mascot|emblem|globe/i.test(combined)) {
    return "mascot_mark";
  }
  if (/icon|globe/i.test(combined)) {
    return "icon";
  }
  return "logo";
}

export function detectBrandAssetsFromProfiles(
  profiles: NonNullable<BrandAssetProtectionInput["profiles"]>,
  workflowType: BrandAssetProtectionInput["workflowType"]
): ProtectedBrandAsset[] {
  const assets: ProtectedBrandAsset[] = [];
  const seen = new Set<string>();

  for (const profile of profiles) {
    for (const part of profile.parts ?? []) {
      if (!LOGO_LABEL_PATTERN.test(part.label) && part.category !== "accessories") {
        continue;
      }
      if (!LOGO_LABEL_PATTERN.test(part.label) && !LABEL_PATTERN.test(part.label)) {
        continue;
      }
      const key = `${profile.referenceId}:${part.id}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      const assetType = inferAssetType(part.label, part.category);
      assets.push(
        createProtectedAsset({
          id: key,
          assetType,
          sourceUrl: profile.imageUrl,
          label: part.label,
          detectedFrom: "vision",
          preserveMode: resolveDefaultPreserveMode(workflowType, assetType),
        })
      );
    }

    for (const trait of profile.identityTraits ?? []) {
      if (!LOGO_LABEL_PATTERN.test(trait)) {
        continue;
      }
      const key = `${profile.referenceId}:trait:${trait}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      const assetType = inferAssetType(trait);
      assets.push(
        createProtectedAsset({
          id: key,
          assetType,
          sourceUrl: profile.imageUrl,
          label: trait,
          detectedFrom: "vision",
          preserveMode: resolveDefaultPreserveMode(workflowType, assetType),
        })
      );
    }
  }

  return assets;
}

export function detectBrandAssetsFromLogoReferences(
  logoAssets: NonNullable<BrandAssetProtectionInput["logoAssets"]>,
  workflowType: BrandAssetProtectionInput["workflowType"],
  userPreserveLogoExact?: boolean
): ProtectedBrandAsset[] {
  return logoAssets.map((logo) =>
    createProtectedAsset({
      id: logo.referenceId,
      assetType: "logo",
      sourceUrl: logo.url,
      label: logo.name ?? "Logo",
      detectedFrom: "reference",
      preserveMode: resolveDefaultPreserveMode(workflowType, "logo", { userPreserveLogoExact }),
    })
  );
}

export function detectBrandAssetsFromLogoPlacement(
  blueprint: LogoPlacementBlueprint,
  workflowType: BrandAssetProtectionInput["workflowType"] = "logo_placement"
): ProtectedBrandAsset[] {
  const quadResult = blueprint.quad
    ? {
        quad: blueprint.quad,
        source: blueprint.quadSource ?? ("user" as const),
        placementMode: blueprint.placementMode,
        surfaceType: blueprint.surfaceType,
        surfaceShape: blueprint.surfaceShape,
      }
    : generatePlacementQuad({
        bbox: blueprint.targetBounds,
        objectLabel: blueprint.targetLabel,
        surfaceType: blueprint.surfaceType,
        placementMode: blueprint.placementMode,
      });

  return [
    createProtectedAsset({
      id: `logo_placement:${blueprint.targetObjectId}`,
      assetType: "text_logo",
      sourceUrl: blueprint.logoAssetUrl,
      label: blueprint.targetLabel,
      targetBounds: blueprint.targetBounds,
      quad: quadResult.quad,
      surfaceType: quadResult.surfaceType ?? blueprint.surfaceType,
      surfaceShape: quadResult.surfaceShape ?? blueprint.surfaceShape,
      placementMode: quadResult.placementMode ?? blueprint.placementMode,
      quadSource: quadResult.source ?? blueprint.quadSource,
      detectedFrom: "upload",
      preserveMode: blueprint.preserveLogoExact
        ? resolveDefaultPreserveMode(workflowType, "text_logo", { userPreserveLogoExact: true })
        : "reference_asset",
      mustRemainExact: blueprint.preserveLogoExact,
    }),
  ];
}

export function buildMascotTransformProtectedAssets(input: {
  preserveLogo: boolean;
  sourceImageUrl?: string;
}): ProtectedBrandAsset[] {
  if (!input.preserveLogo || !input.sourceImageUrl?.trim()) {
    return [];
  }
  return [
    createProtectedAsset({
      id: "mascot_mark:source",
      assetType: "mascot_mark",
      sourceUrl: input.sourceImageUrl,
      label: "Mascot emblem",
      detectedFrom: "vision",
      preserveMode: "reference_asset",
    }),
    createProtectedAsset({
      id: "mascot_logo:source",
      assetType: "logo",
      sourceUrl: input.sourceImageUrl,
      label: "HomeCheff logo",
      detectedFrom: "registry",
      preserveMode: "reference_asset",
    }),
  ];
}

function applyProductBrandingLogoGeometry(
  assets: ProtectedBrandAsset[],
  geometry: ProductBrandingLogoGeometry
): ProtectedBrandAsset[] {
  return assets.map((asset) => {
    if (asset.preserveMode !== "post_composite") {
      return asset;
    }
    if (asset.assetType !== "logo" && asset.assetType !== "text_logo") {
      return asset;
    }
    return {
      ...asset,
      targetBounds: geometry.bounds,
      quad: geometry.quad,
      quadSource: geometry.quadSource,
      placementMode: geometry.placementMode,
      surfaceType: geometry.surfaceType,
      surfaceShape: geometry.surfaceShape,
      label: geometry.targetLabel,
    };
  });
}

function mergeProtectedAssets(assets: ProtectedBrandAsset[]): ProtectedBrandAsset[] {
  const byKey = new Map<string, ProtectedBrandAsset>();
  for (const asset of assets) {
    const key = `${asset.sourceUrl}:${asset.assetType}:${asset.label ?? asset.id}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, asset);
      continue;
    }
    const modeRank: Record<BrandAssetPreserveMode, number> = {
      prompt_only: 0,
      reference_asset: 1,
      post_composite: 2,
    };
    if (modeRank[asset.preserveMode] > modeRank[existing.preserveMode]) {
      byKey.set(key, { ...existing, ...asset, preserveMode: asset.preserveMode });
    }
  }
  return [...byKey.values()];
}

export function buildBrandProtectionLog(assets: ProtectedBrandAsset[]): BrandAssetProtectionLog {
  const modes = [...new Set(assets.map((a) => a.preserveMode))];
  return {
    protectedBrandAssetsCount: assets.length,
    protectionModesUsed: modes,
    postCompositeApplied: false,
    validationPassed: true,
    validationWarnings: [],
  };
}

export function buildBrandAssetProtectionLayer(
  input: BrandAssetProtectionInput
): BrandAssetProtectionResult {
  const preserveLogoExact =
    input.userPreserveLogoExact ??
    input.generationSettings?.preserveLogoExact !== false;

  const fromLogos = detectBrandAssetsFromLogoReferences(
    input.logoAssets ?? [],
    input.workflowType,
    preserveLogoExact
  );
  const fromProfiles = detectBrandAssetsFromProfiles(input.profiles ?? [], input.workflowType);
  const fromPlacement = input.logoPlacement
    ? detectBrandAssetsFromLogoPlacement(input.logoPlacement, input.workflowType)
    : [];
  const fromMascot =
    input.mascotPreserveLogo && input.profiles?.[0]?.imageUrl
      ? buildMascotTransformProtectedAssets({
          preserveLogo: true,
          sourceImageUrl: input.profiles[0].imageUrl,
        })
      : [];

  let assets = mergeProtectedAssets([
    ...fromLogos,
    ...fromProfiles,
    ...fromPlacement,
    ...fromMascot,
  ]);

  if (input.productBrandingLogoGeometry && input.workflowType === "product_branding") {
    assets = applyProductBrandingLogoGeometry(assets, input.productBrandingLogoGeometry);
  }

  if (preserveLogoExact) {
    assets = assets.map((asset) => {
      if (asset.assetType === "logo" || asset.assetType === "text_logo" || asset.assetType === "mascot_mark") {
        const mode = resolveDefaultPreserveMode(input.workflowType, asset.assetType, {
          userPreserveLogoExact: true,
          hasText: asset.assetType === "text_logo",
        });
        return { ...asset, preserveMode: mode, mustRemainExact: true };
      }
      return asset;
    });
  }

  const positionSetting =
    typeof input.generationSettings?.position === "string"
      ? input.generationSettings.position
      : undefined;

  assets = assets.map((asset) => {
    if (asset.preserveMode !== "post_composite" || asset.targetBounds) {
      return asset;
    }
    return {
      ...asset,
      targetBounds: defaultLogoPlacementBounds(positionSetting),
    };
  });

  if (input.workflowType === "outfit_from_reference" || input.workflowType === "person_outfit") {
    assets = assets.map((asset) => {
      if (asset.assetType === "logo" || asset.assetType === "label" || asset.assetType === "text_logo") {
        return {
          ...asset,
          preserveMode: "reference_asset" as const,
          mustRemainExact: true,
        };
      }
      return asset;
    });
    if (!assets.some((a) => a.label?.toLowerCase().includes("logo"))) {
      const sourceUrl = input.profiles?.[0]?.imageUrl?.trim();
      if (sourceUrl) {
        assets.push(
          createProtectedAsset({
            id: "outfit_clothing_logo_guard",
            assetType: "logo",
            sourceUrl,
            label: "Clothing logo",
            detectedFrom: "vision",
            preserveMode: "reference_asset",
          })
        );
      }
    }
  }

  const postCompositeAssets = assets.filter((a) => a.preserveMode === "post_composite");
  const referenceAssets = assets.filter((a) => a.preserveMode === "reference_asset");

  const renderInstructions: string[] = [];
  if (input.productBrandingLogoGeometry && input.workflowType === "product_branding") {
    const geometry = input.productBrandingLogoGeometry;
    renderInstructions.push(
      `Leave logo placement area clear on "${geometry.targetLabel}" for post-composite.`,
      geometry.hasPolygon
        ? "Placement follows detected surface polygon from vision."
        : geometry.hasMask
          ? "Placement follows detected segmentation mask from vision."
          : "Placement follows detected product bounds."
    );
    if (geometry.placementMode === "perspective_warp") {
      renderInstructions.push("Preserve perspective — logo will be warped from the original asset after render.");
    }
  }
  if (postCompositeAssets.length) {
    renderInstructions.push(
      "Render the scene without redrawing protected logos — leave clean placement areas where logos will be composited afterward."
    );
    for (const asset of postCompositeAssets) {
      if (asset.targetBounds) {
        renderInstructions.push(
          `Leave placement area clear at normalized bounds x=${asset.targetBounds.x.toFixed(2)}, y=${asset.targetBounds.y.toFixed(2)}, w=${asset.targetBounds.width.toFixed(2)}, h=${asset.targetBounds.height.toFixed(2)} for ${asset.label ?? "logo"}.`
        );
      }
    }
  }
  if (referenceAssets.length) {
    renderInstructions.push(
      "Protected brand assets are supplied as reference images — reproduce them exactly, do not reinterpret."
    );
  }

  const log = buildBrandProtectionLog(assets);

  return {
    assets,
    active: assets.length > 0,
    preserveLogoExact,
    renderInstructions,
    promptRules: [...BRAND_PROTECTION_PROMPT_RULES],
    postCompositeAssets,
    referenceAssets,
    overlayPlans: [] as PostCompositeOverlayPlan[],
    log,
  };
}

export function buildBrandProtectionPromptBlock(result: BrandAssetProtectionResult): string[] {
  if (!result.active) {
    return [];
  }
  const lines = ["BRAND ASSET PROTECTION", ...result.promptRules];
  for (const asset of result.assets) {
    lines.push(
      `- Protected ${asset.assetType}${asset.label ? ` (${asset.label})` : ""}: mode=${asset.preserveMode}, exact=${asset.mustRemainExact}`
    );
  }
  if (result.renderInstructions.length) {
    lines.push("PLACEMENT", ...result.renderInstructions.map((r) => `- ${r}`));
  }
  return lines;
}

export function validateProtectedBrandAssetsPostRender(input: {
  protection: BrandAssetProtectionResult;
  renderSucceeded: boolean;
  postCompositeApplied?: boolean;
  perspectiveWarpApplied?: boolean;
}): BrandAssetPostRenderValidation {
  const warnings: string[] = [];
  const missingAssetIds: string[] = [];

  if (!input.renderSucceeded) {
    return {
      passed: false,
      warnings: ["Render did not complete successfully."],
      missingAssetIds: input.protection.assets.map((a) => a.id),
      recoverableViaPostComposite: input.protection.postCompositeAssets.length > 0,
    };
  }

  if (!input.protection.active) {
    return { passed: true, warnings: [], missingAssetIds: [], recoverableViaPostComposite: false };
  }

  const postCompositeAssets = input.protection.postCompositeAssets;
  if (postCompositeAssets.length && !input.postCompositeApplied) {
    warnings.push(
      `${postCompositeAssets.length} protected asset(s) require post-composite placement.`
    );
    for (const asset of postCompositeAssets) {
      missingAssetIds.push(asset.id);
    }
  }

  const warpAssets = postCompositeAssets.filter(
    (asset) => asset.placementMode === "perspective_warp"
  );
  if (warpAssets.length && input.postCompositeApplied && !input.perspectiveWarpApplied) {
    warnings.push(
      `${warpAssets.length} asset(s) expected perspective warp but received axis-aligned composite only.`
    );
  }

  const criticalWithoutComposite = input.protection.assets.filter(
    (a) => a.mustRemainExact && a.preserveMode !== "post_composite" && a.preserveMode !== "reference_asset"
  );
  if (criticalWithoutComposite.length) {
    warnings.push(
      `${criticalWithoutComposite.length} critical asset(s) rely on prompt-only protection — verify logo fidelity manually.`
    );
  }

  return {
    passed: warnings.length === 0,
    warnings,
    missingAssetIds,
    recoverableViaPostComposite: postCompositeAssets.length > 0 && !input.postCompositeApplied,
    perspectiveWarpApplied: input.perspectiveWarpApplied,
    quadUsed: Boolean(input.perspectiveWarpApplied),
  };
}

export function withBrandProtectionLogApplied(
  log: BrandAssetProtectionLog,
  patch: Partial<BrandAssetProtectionLog>
): BrandAssetProtectionLog {
  return { ...log, ...patch };
}

export function workflowUsesBrandProtection(workflowType: EditorFusionIntent | string): boolean {
  return (
    POST_COMPOSITE_WORKFLOWS.has(workflowType) ||
    REFERENCE_ASSET_WORKFLOWS.has(workflowType) ||
    workflowType === "product_packaging" ||
    workflowType === "product_environment" ||
    workflowType === "mascot_transform" ||
    workflowType === "logo_placement"
  );
}

export function defaultPreserveLogoExactForWorkflow(
  workflowType: EditorFusionIntent | string
): boolean {
  if (workflowType === "logo_placement" || workflowType === "product_branding") {
    return true;
  }
  if (
    workflowType === "product_packaging" ||
    workflowType === "product_environment" ||
    workflowType === "product_family" ||
    workflowType === "campaign_variant"
  ) {
    return true;
  }
  return true;
}
