import {
  buildConsistencyHaystack,
  memoryPhrases,
  reinforcementRecommendation,
  requiredPhraseMatchRatio,
  scorePhrasesAgainstHaystack,
} from "@/lib/studio-consistency-text-signals";
import type { SceneImageConsistencyInput, WorldConsistencyResult } from "@/types/studio-consistency";
import type { WorldMemorySnapshot } from "@/types/studio-memory-snapshots";

export function analyzeWorldConsistency(
  world: WorldMemorySnapshot,
  sceneImage: SceneImageConsistencyInput
): WorldConsistencyResult {
  const haystack = buildConsistencyHaystack(
    sceneImage.generatedPrompt,
    sceneImage.sceneTitle,
    sceneImage.sceneDescription,
    sceneImage.sceneAction,
    world.name
  );

  const requiredRatio = requiredPhraseMatchRatio(world.continuityStrength);
  const phrases = [
    ...memoryPhrases(world.visualStyle),
    ...memoryPhrases(world.tone),
    ...memoryPhrases(world.continuityRules),
    world.name,
  ];

  const { score, missing } = scorePhrasesAgainstHaystack(haystack, phrases, requiredRatio);
  const warnings: string[] = [];
  const recommendations: string[] = [];

  for (const phrase of missing) {
    warnings.push(`${world.name} world style: ${phrase} drift detected`);
    recommendations.push(reinforcementRecommendation(`${world.name} visual style`, phrase));
  }

  return {
    score: Math.min(100, Math.max(0, score)),
    warnings,
    recommendations,
  };
}
