import { resolveBrandLockedAssetsFromInstructionStudioState } from "@/lib/brand-asset-motion-lock";
import { resolveEditorStudioEntry } from "@/lib/editor-studio-entry";
import type { BrandLockedAsset } from "@/types/brand-asset-protection";

export type EditorMotionBootstrap = {
  imageUrl: string;
  imageUrls: string[];
  label: string;
  sessionId: string;
  assetId?: string;
  source: "editor_session" | "editor_asset";
  cutoutUrls: string[];
  placementUrls: string[];
  compositorLayerUrls: string[];
  brandLockedAssets: BrandLockedAsset[];
};

export function resolveEditorMotionBootstrap(params: {
  editorSession?: string | null;
  editorAsset?: string | null;
  assetImageUrl?: string | null;
}): EditorMotionBootstrap | null {
  const sessionEntry = resolveEditorStudioEntry(params.editorSession);
  if (sessionEntry) {
    const primary = sessionEntry.instructionHandoff.activeVariantUrl;
    const imageUrls = [
      primary,
      ...sessionEntry.compositorLayerUrls,
      ...sessionEntry.cutoutUrls,
      ...sessionEntry.placementUrls,
    ].filter((url, index, arr) => url && arr.indexOf(url) === index);
    const imageUrl = primary || imageUrls[0];
    if (!imageUrl) {
      return null;
    }
    return {
      imageUrl,
      imageUrls,
      label: sessionEntry.document.name,
      sessionId: sessionEntry.sessionId,
      assetId: params.editorAsset?.trim() || sessionEntry.document.sourceAssetId || undefined,
      source: "editor_session",
      cutoutUrls: sessionEntry.cutoutUrls,
      placementUrls: sessionEntry.placementUrls,
      compositorLayerUrls: sessionEntry.compositorLayerUrls,
      brandLockedAssets: resolveBrandLockedAssetsFromInstructionStudioState(
        sessionEntry.document.instructionStudioState
      ),
    };
  }

  const assetId = params.editorAsset?.trim();
  const imageUrl = params.assetImageUrl?.trim();
  if (assetId && imageUrl) {
    return {
      imageUrl,
      imageUrls: [imageUrl],
      label: "Editor asset",
      sessionId: params.editorSession?.trim() ?? "",
      assetId,
      source: "editor_asset",
      cutoutUrls: [],
      placementUrls: [],
      compositorLayerUrls: [],
      brandLockedAssets: [],
    };
  }

  return null;
}
