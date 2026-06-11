import { resolveMascotExpansionKind } from "@/lib/editor-character-expansion";
import type { EditorPostUploadMode } from "@/lib/editor-start-flow";
import type { EditorAssetType } from "@/types/editor-asset-profile";
import type { EditorCreatorPresetId } from "@/types/editor-instruction-studio";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

export type EditorUserCategory = "generic" | "chef" | "garden" | "designer" | "homecheff";

export type EditorRecommendationContext = {
  isAdmin: boolean;
  showHomeCheffExamples: boolean;
  userCategory: EditorUserCategory;
  brandName: string;
  workflow: EditorPostUploadMode | null;
  assetType: EditorAssetType | null;
  isHomeCheffAsset: boolean;
  hasUserBrandAssets: boolean;
  selectedPresetId: EditorCreatorPresetId | null;
  detectedMascotKind: ReturnType<typeof resolveMascotExpansionKind>;
};

const HOMECHEFF_SIGNAL =
  /homecheff|globe\s*man|globe-man|globeman|homegarden|homedesigner|homecheff chef/i;

function documentSignalText(document: EditorCanvasDocument): string {
  return [
    document.name,
    document.assetProfile?.variantGroup?.groupId,
    document.assetProfile?.variantGroup?.baseLabel,
    document.assetProfile?.studioIntent?.kind,
    ...(document.instructionStudioState?.brandReferences ?? []).map((r) => r.name),
  ]
    .filter(Boolean)
    .join(" ");
}

export function isHomeCheffBrandedDocument(document: EditorCanvasDocument): boolean {
  return HOMECHEFF_SIGNAL.test(documentSignalText(document));
}

export function inferEditorUserCategory(input: {
  document: EditorCanvasDocument;
  showHomeCheffExamples: boolean;
}): EditorUserCategory {
  const { document, showHomeCheffExamples } = input;
  if (showHomeCheffExamples) {
    return "homecheff";
  }

  const mascot = resolveMascotExpansionKind(document);
  if (mascot === "chef") {
    return "chef";
  }
  if (mascot === "garden") {
    return "garden";
  }
  if (mascot === "designer") {
    return "designer";
  }

  const assetType = document.assetProfile?.assetType;
  if (assetType === "food") {
    return "chef";
  }
  if (assetType === "garden_asset" || assetType === "plant") {
    return "garden";
  }
  if (assetType === "product" || assetType === "brand_asset") {
    return "designer";
  }

  const groupId = document.assetProfile?.variantGroup?.groupId;
  if (groupId === "chef") {
    return "chef";
  }
  if (groupId === "garden") {
    return "garden";
  }
  if (groupId === "designer") {
    return "designer";
  }

  return "generic";
}

export function resolveEditorBrandName(document: EditorCanvasDocument, showHomeCheffExamples: boolean): string {
  const userBrand = document.instructionStudioState?.brandReferences?.[0]?.name?.trim();
  if (userBrand) {
    return userBrand;
  }
  if (showHomeCheffExamples || isHomeCheffBrandedDocument(document)) {
    return "HomeCheff";
  }
  return "your brand";
}

export function buildEditorRecommendationContext(input: {
  document: EditorCanvasDocument;
  isAdmin?: boolean;
}): EditorRecommendationContext {
  const { document, isAdmin = false } = input;
  const isHomeCheffAsset = isHomeCheffBrandedDocument(document);
  const detectedMascotKind = resolveMascotExpansionKind(document);
  const hasUserBrandAssets = (document.instructionStudioState?.brandReferences?.length ?? 0) > 0;
  const explicitPreset = document.instructionStudioState?.selectedCreatorPresetId ?? null;

  const showHomeCheffExamples =
    isAdmin || isHomeCheffAsset || detectedMascotKind === "globe_man";

  const userCategory = inferEditorUserCategory({ document, showHomeCheffExamples });
  const brandName = resolveEditorBrandName(document, showHomeCheffExamples);

  return {
    isAdmin,
    showHomeCheffExamples,
    userCategory,
    brandName,
    workflow: document.editorFlowMode ?? null,
    assetType: document.assetProfile?.assetType ?? null,
    isHomeCheffAsset,
    hasUserBrandAssets,
    selectedPresetId: explicitPreset,
    detectedMascotKind,
  };
}
