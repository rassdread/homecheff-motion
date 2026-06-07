import {
  buildConsistencyHaystack,
  memoryPhrases,
  reinforcementRecommendation,
  requiredPhraseMatchRatio,
  scorePhrasesAgainstHaystack,
} from "@/lib/studio-consistency-text-signals";
import {
  mergeConsistencyPhrases,
  propIdentityConsistencyPhrases,
} from "@/lib/studio-identity-consistency-phrases";
import type { PropConsistencyResult, SceneImageConsistencyInput } from "@/types/studio-consistency";
import type { PropMemorySnapshot } from "@/types/studio-memory-snapshots";

export function analyzePropConsistency(
  prop: PropMemorySnapshot,
  sceneImage: SceneImageConsistencyInput
): PropConsistencyResult {
  const haystack = buildConsistencyHaystack(
    sceneImage.generatedPrompt,
    sceneImage.sceneTitle,
    sceneImage.sceneDescription,
    sceneImage.sceneAction
  );

  const requiredRatio = requiredPhraseMatchRatio(prop.continuityStrength);
  const phrases = mergeConsistencyPhrases(
    memoryPhrases(prop.appearanceMemory),
    memoryPhrases(prop.brandingRules),
    propIdentityConsistencyPhrases(prop),
    [prop.name]
  );

  const { score, missing } = scorePhrasesAgainstHaystack(haystack, phrases, requiredRatio);
  const warnings: string[] = [];
  const recommendations: string[] = [];

  for (const phrase of missing) {
    if (phrase.toLowerCase().includes("logo") || phrase.toLowerCase().includes("globe")) {
      warnings.push(`${prop.name}: HomeCheff globe logo not visible in prompt alignment`);
    } else {
      warnings.push(`${prop.name}: ${phrase} inconsistent`);
    }
    recommendations.push(reinforcementRecommendation(prop.name, phrase));
  }

  if (!haystack.includes(prop.name.toLowerCase()) && prop.name.length > 2) {
    warnings.push(`${prop.name} expected in scene but not referenced in prompt`);
    recommendations.push(`Reinforce visible ${prop.name} when it should appear`);
  }

  return {
    propId: prop.id,
    name: prop.name,
    score: Math.min(100, Math.max(0, score)),
    warnings,
    recommendations,
  };
}
