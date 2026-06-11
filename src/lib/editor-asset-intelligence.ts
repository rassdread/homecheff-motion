import { computeStudioHandoffScore } from "@/lib/editor-v6-handoff-score";
import { buildMotionReadinessReport } from "@/lib/editor-asset-motion-intelligence";
import { resolveEcosystemDestination, resolveLibraryIntelligence } from "@/lib/editor-asset-ecosystem-routing";
import { buildStudioAssetIntent, buildStudioReadinessReport } from "@/lib/editor-asset-studio-intelligence";
import { resolveAssetVariantGroup } from "@/lib/editor-asset-variants";
import { recommendationsForAssetType } from "@/lib/editor-asset-recommendations";
import { buildEditorRecommendationContext } from "@/lib/editor-recommendation-context";
import { resolveAssetSummaryKey } from "@/lib/editor-personalized-recommendations";
import type { AssetVisionAnalysis, AssetVisionObjectType } from "@/types/studio-asset-vision-analysis";
import type { EditorAssetProfile, EditorAssetType } from "@/types/editor-asset-profile";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

function nameHints(name: string): EditorAssetType | null {
  const n = name.toLowerCase();
  if (/logo|brand/.test(n)) {
    return "logo";
  }
  if (/mascot|globe.?man|\bchef\b|character/.test(n)) {
    return "mascot";
  }
  if (/poster|flyer|banner/.test(n)) {
    return /flyer/.test(n) ? "flyer" : "poster";
  }
  if (/food|dish|meal|recipe|restaurant/.test(n)) {
    return "food";
  }
  if (/garden|plant|flower|greenhouse/.test(n)) {
    return /plant|flower/.test(n) ? "plant" : "garden_asset";
  }
  if (/scene|location|world/.test(n)) {
    return "scene";
  }
  return null;
}

function mapVisionObjectType(visionType: AssetVisionObjectType): EditorAssetType {
  const map: Partial<Record<AssetVisionObjectType, EditorAssetType>> = {
    character: "character",
    mascot: "mascot",
    human: "character",
    animal: "character",
    food_item: "food",
    product: "product",
    packaging: "product",
    logo: "logo",
    brand_asset: "brand_asset",
    illustration: "poster",
    location: "scene",
    environment: "scene",
    building: "scene",
    ui_asset: "text_design",
  };
  return map[visionType] ?? "photo";
}

function inferFromDocumentLayers(document: EditorCanvasDocument): EditorAssetType {
  const labels = document.objects
    .filter((o) => o.layerType !== "background")
    .map((o) => `${o.label} ${o.category ?? ""} ${o.semanticType ?? ""}`.toLowerCase())
    .join(" ");
  if (/mascot|globe|chef hat|character/.test(labels)) {
    return "mascot";
  }
  if (/logo/.test(labels)) {
    return "logo";
  }
  if (/food|dish|plate/.test(labels)) {
    return "food";
  }
  if (/plant|garden|flower/.test(labels)) {
    return "garden_asset";
  }
  if (/product|packaging/.test(labels)) {
    return "product";
  }
  if ((document.importedLayers?.length ?? 0) > 2) {
    return "object_collection";
  }
  if ((document.cutoutAssets?.length ?? 0) > 0 && document.editorFlowMode === "motion_prepare") {
    return "motion_asset";
  }
  return "photo";
}

export function detectEditorAssetType(
  document: EditorCanvasDocument,
  vision?: AssetVisionAnalysis | null
): { assetType: EditorAssetType; confidence: number } {
  if (vision?.objectType) {
    const assetType = mapVisionObjectType(vision.objectType);
    return { assetType, confidence: Math.min(1, Math.max(0.45, vision.confidence)) };
  }
  const fromName = nameHints(document.name);
  if (fromName) {
    return { assetType: fromName, confidence: 0.72 };
  }
  if (document.sourceKind === "character") {
    return { assetType: "mascot", confidence: 0.65 };
  }
  if (document.sourceKind === "logo") {
    return { assetType: "logo", confidence: 0.7 };
  }
  if (document.sourceKind === "product_photo") {
    return { assetType: "product", confidence: 0.68 };
  }
  const fromLayers = inferFromDocumentLayers(document);
  return { assetType: fromLayers, confidence: 0.55 };
}

export function buildEditorAssetProfile(
  document: EditorCanvasDocument,
  vision?: AssetVisionAnalysis | null
): EditorAssetProfile {
  const { assetType, confidence } = detectEditorAssetType(document, vision);
  const handoff = computeStudioHandoffScore(document);
  const destination = resolveEcosystemDestination(assetType);
  const libraryIntelligence = resolveLibraryIntelligence(assetType, document);
  const recCtx = buildEditorRecommendationContext({ document });
  const recommendedActions = recommendationsForAssetType(assetType, document, handoff.score);
  const recommendedExports: EditorAssetProfile["recommendedExports"] =
    assetType === "poster" || assetType === "flyer"
      ? ["png", "jpg", "print"]
      : assetType === "logo" || assetType === "mascot"
        ? ["png", "webp", "motion_manifest"]
        : ["png", "jpg", "webp"];

  return {
    assetType,
    confidence,
    humanSummaryKey: resolveAssetSummaryKey(recCtx, assetType),
    recommendedActions,
    recommendedExports,
    recommendedStudioUse: buildStudioReadinessReport(document, assetType),
    recommendedMotionUse: buildMotionReadinessReport(document),
    recommendedDestination: destination,
    libraryIntelligence,
    variantGroup: resolveAssetVariantGroup(document, assetType, vision),
    studioIntent: buildStudioAssetIntent(document, assetType),
    analyzedAt: new Date().toISOString(),
  };
}

export function refreshEditorAssetProfile(document: EditorCanvasDocument): EditorCanvasDocument {
  return {
    ...document,
    assetProfile: buildEditorAssetProfile(document),
    updatedAt: new Date().toISOString(),
  };
}
