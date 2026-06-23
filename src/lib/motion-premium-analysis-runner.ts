import { analyzeAssetStyleDnaApi } from "@/lib/studio-asset-derivation-client";
import { mapVisionJsonToAnalysis } from "@/lib/studio-asset-vision-analysis";
import type { AssetStyleDna } from "@/types/studio-asset-derivation";
import type { AssetVisionAnalysis } from "@/types/studio-asset-vision-analysis";
import type { MotionUploadedReference } from "@/types/motion-preset-engine";

export type MotionPremiumAnalysisResult = {
  references: MotionUploadedReference[];
  premiumAnalysisComplete: boolean;
  analysisIds: string[];
  failedReferenceIds: string[];
};

function referenceNeedsPremiumAnalysis(ref: MotionUploadedReference): boolean {
  if (ref.motionReady && ref.visionAnalysis && ref.styleDna) {
    return false;
  }
  if (ref.visionAnalysis && ref.styleDna) {
    return false;
  }
  return true;
}

/** Run billed Style DNA analysis for uncached references — after user confirms payment. */
export async function runMotionPremiumAnalysisForReferences(input: {
  references: MotionUploadedReference[];
  userIsAdmin?: boolean;
}): Promise<MotionPremiumAnalysisResult> {
  if (input.userIsAdmin) {
    return {
      references: input.references,
      premiumAnalysisComplete: true,
      analysisIds: [],
      failedReferenceIds: [],
    };
  }

  const analysisIds: string[] = [];
  const failedReferenceIds: string[] = [];
  const nextReferences: MotionUploadedReference[] = [];

  for (const ref of input.references) {
    if (!referenceNeedsPremiumAnalysis(ref)) {
      nextReferences.push(ref);
      continue;
    }

    const imageUrl =
      (ref as MotionUploadedReference & { imageUrl?: string }).imageUrl?.trim() ??
      null;
    if (!imageUrl) {
      failedReferenceIds.push(ref.id);
      nextReferences.push(ref);
      continue;
    }

    const jobId = `motion_${ref.id}_${Date.now()}`;
    const res = await analyzeAssetStyleDnaApi({
      imageUrl,
      sourceKind: ref.assetType === "mascot" ? "character" : "character",
      sourceName: ref.assetName ?? ref.fileName ?? "Reference",
      derivationJobId: jobId,
    });

    if (!res.ok) {
      failedReferenceIds.push(ref.id);
      nextReferences.push(ref);
      continue;
    }

    analysisIds.push(jobId);
    nextReferences.push({
      ...ref,
      visionAnalysis: res.data.visionAnalysis,
      styleDna: res.data.styleDna,
      motionReady: ref.motionReady ?? true,
    });
  }

  const premiumAnalysisComplete = failedReferenceIds.length === 0;
  return {
    references: nextReferences,
    premiumAnalysisComplete,
    analysisIds,
    failedReferenceIds,
  };
}

/** Build provisional vision from saved character appearance fields when full analysis is cached server-side. */
export function buildVisionFromCharacterAppearance(input: {
  name: string;
  appearanceMemory?: string;
  visualKeywords?: string;
  defaultClothing?: string;
  isMascot?: boolean;
}): AssetVisionAnalysis {
  return mapVisionJsonToAnalysis(
    {
      objectType: input.isMascot ? "Mascot" : "Human",
      visualStyle: input.visualKeywords || "Saved character reference",
      keyFeatures: [input.defaultClothing, input.appearanceMemory, input.visualKeywords]
        .filter(Boolean)
        .flatMap((v) => v!.split(/[,;]/).map((s) => s.trim()))
        .filter(Boolean)
        .slice(0, 8),
      suggestedPreserve: ["face", "hair", "clothing", "brand identity", "body proportions"],
      faceStructure: input.appearanceMemory?.slice(0, 120) ?? "saved character face",
      proportions: "preserve saved character proportions",
      confidence: 0.88,
    },
    { sourceName: input.name }
  );
}

export function buildStyleDnaFromCharacterAppearance(input: {
  appearanceMemory?: string;
  visualKeywords?: string;
  defaultClothing?: string;
}): AssetStyleDna {
  return {
    visualStyle: input.visualKeywords ?? "saved character",
    colorTheme: input.appearanceMemory?.match(/\b(red|blue|green|black|white|gold|orange)\b/i)?.[0] ?? "",
    outfitHints: input.defaultClothing ?? "",
    shapeLanguage: input.appearanceMemory ?? "",
    brandIdentity: "",
    mascotTraits: "",
    confidence: 0.88,
  };
}
