import {
  buildConsistencyHaystack,
  memoryPhrases,
  reinforcementRecommendation,
  requiredPhraseMatchRatio,
  scorePhrasesAgainstHaystack,
} from "@/lib/studio-consistency-text-signals";
import type {
  LocationConsistencyResult,
  SceneImageConsistencyInput,
} from "@/types/studio-consistency";
import type { LocationMemorySnapshot } from "@/types/studio-memory-snapshots";

export function analyzeLocationConsistency(
  location: LocationMemorySnapshot,
  sceneImage: SceneImageConsistencyInput
): LocationConsistencyResult {
  const haystack = buildConsistencyHaystack(
    sceneImage.generatedPrompt,
    sceneImage.sceneTitle,
    sceneImage.sceneDescription,
    sceneImage.sceneAction,
    location.name
  );

  const requiredRatio = requiredPhraseMatchRatio(location.continuityStrength);
  const phrases = [
    ...memoryPhrases(location.visualIdentity),
    ...memoryPhrases(location.worldMemory),
    ...memoryPhrases(location.environmentKeywords),
    location.name,
  ];

  const { score, missing } = scorePhrasesAgainstHaystack(haystack, phrases, requiredRatio);
  const warnings: string[] = [];
  const recommendations: string[] = [];

  for (const phrase of missing) {
    warnings.push(`${location.name} environment: ${phrase} inconsistent`);
    recommendations.push(reinforcementRecommendation(`${location.name} environment`, phrase));
  }

  if (!haystack.includes(location.name.toLowerCase()) && location.name.length > 2) {
    warnings.push(`${location.name} environment inconsistent`);
    recommendations.push(`Reinforce ${location.name} setting in scene prompt`);
  }

  return {
    score: Math.min(100, Math.max(0, score)),
    warnings,
    recommendations,
  };
}
