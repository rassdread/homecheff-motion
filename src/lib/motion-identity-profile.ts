import { motionIdentityLockPromptBlock } from "@/lib/motion-identity-lock";
import type { MotionReferenceVisionSignals } from "@/lib/motion-reference-vision-signals";
import { resolveIdentityKind } from "@/lib/assistant-identity-preservation";
import { resolveMotionPresetIntelligenceProfile } from "@/lib/motion-preset-intelligence-profiles";
import type { MotionActionPresetId } from "@/types/motion-action-presets";
import type {
  MotionIdentityProfile,
  MotionUploadedReference,
} from "@/types/motion-preset-engine";
import type { MotionAnalysisCacheResult } from "@/lib/motion-analysis-cache";

export type BuildMotionIdentityProfileInput = {
  presetId: MotionActionPresetId | null;
  references: MotionUploadedReference[];
  cache: MotionAnalysisCacheResult;
  primaryReferenceId?: string | null;
  visionSignals?: MotionReferenceVisionSignals[];
};

/** Unified identity profile — reuses Style DNA, vision, mascot/brand heuristics. */
export function buildMotionIdentityProfile(
  input: BuildMotionIdentityProfileInput
): MotionIdentityProfile {
  const primary =
    input.references.find((r) => r.id === input.primaryReferenceId) ?? input.references[0] ?? null;
  const kind = resolveIdentityKind({
    assetType: primary?.assetType,
    assetName: primary?.assetName ?? primary?.fileName,
    taxonomyType: primary?.assetType,
  });

  const styleDna = input.cache.styleDna ?? primary?.styleDna ?? null;
  const vision = input.cache.visionAnalysis ?? primary?.visionAnalysis ?? null;

  const intelligence = input.presetId
    ? resolveMotionPresetIntelligenceProfile(input.presetId)
    : null;

  const profile: MotionIdentityProfile = {
    version: 1,
    presetId: input.presetId,
    primaryReferenceId: primary?.id ?? null,
    sources: input.cache.sources.length ? input.cache.sources : ["heuristic"],
    face: vision?.identityFingerprint?.faceStructure
      ? [vision.identityFingerprint.faceStructure]
      : kind === "human"
        ? ["preserve face structure"]
        : [],
    hair: vision?.identityFingerprint?.accessoryPattern
      ? [vision.identityFingerprint.accessoryPattern]
      : [],
    beard: [],
    bodyProportions: vision?.identityFingerprint?.proportions
      ? [vision.identityFingerprint.proportions]
      : ["preserve body proportions"],
    skinTone: vision?.identityFingerprint?.colorDna ? [vision.identityFingerprint.colorDna] : [],
    clothing: styleDna?.outfitHints ? [styleDna.outfitHints] : [],
    accessories: vision?.keyFeatures?.filter((f) => /glass|watch|hat|bag/i.test(f)) ?? [],
    jewelry: vision?.keyFeatures?.filter((f) => /ring|necklace|earring|jewel/i.test(f)) ?? [],
    glasses: vision?.keyFeatures?.filter((f) => /glass|sunglass/i.test(f)) ?? [],
    mascotTraits: styleDna?.mascotTraits ? [styleDna.mascotTraits] : kind.includes("mascot") ? ["preserve mascot design"] : [],
    logoTraits: styleDna?.brandIdentity ? [styleDna.brandIdentity] : [],
    brandColors: styleDna?.colorTheme ? [styleDna.colorTheme] : [],
    styleDnaSummary: styleDna
      ? [styleDna.visualStyle, styleDna.shapeLanguage, styleDna.colorTheme].filter(Boolean)
      : [],
    environmentHints: intelligence ? [intelligence.environment] : [],
    motionSuitability: primary?.motionReady ? ["motion-ready reference"] : ["standard photo reference"],
    identityPromptBlock: "",
    intelligencePromptBlock: intelligence?.structuredPromptBlock ?? "",
    analysisCached: input.cache.cachedAnalysisCount > 0 && !input.cache.shouldRunAnalysis,
  };

  profile.identityPromptBlock = motionIdentityLockPromptBlock(profile, input.visionSignals);
  return profile;
}
