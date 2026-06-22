/**
 * Cross-session premium analysis reuse for fusion references.
 * One premium analysis per asset/image — not per project or workflow.
 */

import { documentHasPremiumVisionAnalysis } from "@/lib/editor-vision-analysis-tier";
import { resolveEditorAssetId } from "@/lib/editor-project-isolation";
import {
  FUSION_REFERENCE_ANALYSIS_VERSION,
  type ReferenceAnalysisProfile,
} from "@/types/editor-fusion-intelligence";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

const profileByAssetKey = new Map<string, ReferenceAnalysisProfile>();
const profileByImageUrl = new Map<string, ReferenceAnalysisProfile>();

function assetCacheKey(document: EditorCanvasDocument): string {
  return resolveEditorAssetId(document);
}

function normalizeImageUrl(url: string): string {
  return url.trim();
}

export function readCachedFusionAnalysisProfileByUrl(
  imageUrl: string
): ReferenceAnalysisProfile | null {
  return profileByImageUrl.get(normalizeImageUrl(imageUrl)) ?? null;
}

export function hasValidPremiumAnalysis(
  document: EditorCanvasDocument | string
): boolean {
  if (typeof document === "string") {
    const cached = profileByAssetKey.get(document);
    return Boolean(
      cached &&
        cached.analysisVersion === FUSION_REFERENCE_ANALYSIS_VERSION &&
        cached.confidence > 0
    );
  }

  if (!documentHasPremiumVisionAnalysis(document)) {
    return false;
  }

  const profile = document.referenceAnalysisProfile;
  if (
    profile &&
    profile.imageUrl === document.backgroundUrl?.trim() &&
    profile.analysisVersion === FUSION_REFERENCE_ANALYSIS_VERSION
  ) {
    return true;
  }

  const cached = profileByAssetKey.get(assetCacheKey(document));
  if (
    cached &&
    cached.imageUrl === document.backgroundUrl?.trim() &&
    cached.analysisVersion === FUSION_REFERENCE_ANALYSIS_VERSION
  ) {
    return true;
  }

  return false;
}

export function premiumAnalysisNeedsRefresh(
  document: EditorCanvasDocument,
  options?: { force?: boolean }
): boolean {
  if (options?.force) {
    return true;
  }
  if (!document.backgroundUrl?.trim()) {
    return false;
  }
  if (!hasValidPremiumAnalysis(document)) {
    return true;
  }
  const profile = document.referenceAnalysisProfile;
  if (profile && profile.imageUrl !== document.backgroundUrl.trim()) {
    return true;
  }
  return false;
}

export function readCachedFusionAnalysisProfile(
  document: EditorCanvasDocument
): ReferenceAnalysisProfile | null {
  const onDoc = document.referenceAnalysisProfile;
  if (
    onDoc &&
    onDoc.imageUrl === document.backgroundUrl?.trim() &&
    onDoc.analysisVersion === FUSION_REFERENCE_ANALYSIS_VERSION
  ) {
    return onDoc;
  }
  const cached = profileByAssetKey.get(assetCacheKey(document));
  if (cached && cached.imageUrl === document.backgroundUrl?.trim()) {
    return cached;
  }
  return null;
}

export function writeCachedFusionAnalysisProfile(
  document: EditorCanvasDocument,
  profile: ReferenceAnalysisProfile
): EditorCanvasDocument {
  profileByAssetKey.set(profile.assetId, profile);
  profileByAssetKey.set(assetCacheKey(document), profile);
  profileByImageUrl.set(normalizeImageUrl(profile.imageUrl), profile);
  return {
    ...document,
    referenceAnalysisProfile: profile,
    updatedAt: new Date().toISOString(),
  };
}

export function clearFusionAnalysisCacheForTests(): void {
  profileByAssetKey.clear();
  profileByImageUrl.clear();
}

export function fusionAnalysisCacheSizeForTests(): number {
  return profileByAssetKey.size;
}
