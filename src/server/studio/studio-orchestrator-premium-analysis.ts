/**
 * Run premium analysis (Style DNA, character intelligence) before Motion generation.
 */

import { extractAssetStyleDna } from "@/server/studio/extract-asset-style-dna";
import { getStudioCharacterByIdForViewer } from "@/server/studio/studio-character-service";
import {
  buildStyleDnaFromCharacterAppearance,
  buildVisionFromCharacterAppearance,
} from "@/lib/motion-premium-analysis-runner";
import type { SessionUser } from "@/server/auth/session";

export type OrchestratorPremiumAnalysisResult = {
  analysisComplete: boolean;
  styleDnaCached: boolean;
  motionIdentityCached: boolean;
  characterIntelligenceCached: boolean;
  analysisIds: string[];
};

export async function runOrchestratorPremiumAnalysis(params: {
  viewer: Pick<SessionUser, "id" | "role">;
  characterId?: string;
}): Promise<OrchestratorPremiumAnalysisResult> {
  const empty: OrchestratorPremiumAnalysisResult = {
    analysisComplete: true,
    styleDnaCached: false,
    motionIdentityCached: false,
    characterIntelligenceCached: false,
    analysisIds: [],
  };

  if (!params.characterId) {
    return empty;
  }

  const character = await getStudioCharacterByIdForViewer(params.characterId, params.viewer);
  if (!character) {
    return { ...empty, analysisComplete: false };
  }

  const imageUrl = character.referenceImageUrl?.trim();
  if (!imageUrl) {
    buildVisionFromCharacterAppearance({
      name: character.name,
      appearanceMemory: character.appearanceMemory ?? undefined,
      visualKeywords: character.visualKeywords ?? undefined,
      defaultClothing: character.defaultClothing ?? undefined,
      isMascot: character.role === "mascot",
    });
    buildStyleDnaFromCharacterAppearance({
      appearanceMemory: character.appearanceMemory ?? undefined,
      visualKeywords: character.visualKeywords ?? undefined,
      defaultClothing: character.defaultClothing ?? undefined,
    });
    return {
      ...empty,
      styleDnaCached: true,
      motionIdentityCached: true,
      characterIntelligenceCached: true,
    };
  }

  const jobId = `orchestrator_${params.characterId}_${Date.now()}`;
  const result = await extractAssetStyleDna(params.viewer, {
    imageUrl,
    sourceKind: character.role === "mascot" ? "character" : "character",
    sourceName: character.name,
    derivationJobId: jobId,
  });

  if ("error" in result) {
    return { ...empty, analysisComplete: false };
  }

  return {
    analysisComplete: true,
    styleDnaCached: Boolean(result.data.styleDna),
    motionIdentityCached: Boolean(result.data.visionAnalysis),
    characterIntelligenceCached: Boolean(result.data.visionAnalysis),
    analysisIds: [jobId],
  };
}
