import type { AssetStyleDna } from "@/types/studio-asset-derivation";
import type { AssetVisionAnalysis } from "@/types/studio-asset-vision-analysis";
import type {
  MotionIdentityProfileSource,
  MotionUploadedReference,
} from "@/types/motion-preset-engine";

export type MotionAnalysisCacheLookupInput = {
  references: MotionUploadedReference[];
  existingIdentityProfile?: { sources: MotionIdentityProfileSource[] } | null;
  motionReadyAnalysis?: { styleDna?: AssetStyleDna | null; vision?: AssetVisionAnalysis | null } | null;
  characterStudioAnalysis?: { styleDna?: AssetStyleDna | null; vision?: AssetVisionAnalysis | null } | null;
};

export type MotionAnalysisCacheResult = {
  cachedAnalysisCount: number;
  sources: MotionIdentityProfileSource[];
  styleDna: AssetStyleDna | null;
  visionAnalysis: AssetVisionAnalysis | null;
  sufficientForIdentity: boolean;
  shouldRunAnalysis: boolean;
};

/** Reuse existing analysis records before any paid vision call. */
export function resolveMotionAnalysisCache(
  input: MotionAnalysisCacheLookupInput
): MotionAnalysisCacheResult {
  const sources: MotionIdentityProfileSource[] = [];
  let styleDna: AssetStyleDna | null = null;
  let visionAnalysis: AssetVisionAnalysis | null = null;
  let cachedAnalysisCount = 0;

  if (input.existingIdentityProfile?.sources?.length) {
    sources.push("motion_identity_profile");
    cachedAnalysisCount += 1;
  }

  const motionReady = input.motionReadyAnalysis;
  if (motionReady?.vision || motionReady?.styleDna) {
    sources.push("motion_ready");
    styleDna = styleDna ?? motionReady.styleDna ?? null;
    visionAnalysis = visionAnalysis ?? motionReady.vision ?? null;
    cachedAnalysisCount += 1;
  }

  const studio = input.characterStudioAnalysis;
  if (studio?.vision || studio?.styleDna) {
    sources.push("character_studio");
    styleDna = styleDna ?? studio.styleDna ?? null;
    visionAnalysis = visionAnalysis ?? studio.vision ?? null;
    cachedAnalysisCount += 1;
  }

  for (const ref of input.references) {
    if (ref.styleDna) {
      if (!sources.includes("asset_style_dna")) {
        sources.push("asset_style_dna");
      }
      styleDna = styleDna ?? ref.styleDna;
      cachedAnalysisCount += 1;
    }
    if (ref.visionAnalysis) {
      if (!sources.includes("reference_analysis")) {
        sources.push("reference_analysis");
      }
      visionAnalysis = visionAnalysis ?? ref.visionAnalysis;
      cachedAnalysisCount += 1;
    }
    if (ref.motionReady) {
      if (!sources.includes("motion_ready")) {
        sources.push("motion_ready");
      }
      cachedAnalysisCount += 1;
    }
  }

  const uniqueSources = [...new Set(sources)];
  const sufficientForIdentity = Boolean(styleDna || visionAnalysis || uniqueSources.includes("motion_ready"));
  const referenceCount = Math.max(1, input.references.length);
  const shouldRunAnalysis = !sufficientForIdentity || cachedAnalysisCount < referenceCount;

  return {
    cachedAnalysisCount: Math.min(referenceCount, cachedAnalysisCount),
    sources: uniqueSources,
    styleDna,
    visionAnalysis,
    sufficientForIdentity,
    shouldRunAnalysis,
  };
}
