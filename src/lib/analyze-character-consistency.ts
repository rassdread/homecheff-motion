import {
  buildConsistencyHaystack,
  memoryPhrases,
  reinforcementRecommendation,
  requiredPhraseMatchRatio,
  scorePhrasesAgainstHaystack,
} from "@/lib/studio-consistency-text-signals";
import type {
  CharacterConsistencyResult,
  SceneImageConsistencyInput,
} from "@/types/studio-consistency";
import type { CharacterMemorySnapshot } from "@/types/studio-memory-snapshots";

export function analyzeCharacterConsistency(
  character: CharacterMemorySnapshot,
  sceneImage: SceneImageConsistencyInput
): CharacterConsistencyResult {
  const haystack = buildConsistencyHaystack(
    sceneImage.generatedPrompt,
    sceneImage.sceneTitle,
    sceneImage.sceneDescription,
    sceneImage.sceneAction
  );

  const requiredRatio = requiredPhraseMatchRatio(character.identityStrength);
  const phrases = [
    ...memoryPhrases(character.appearanceMemory),
    ...memoryPhrases(character.defaultClothing),
    ...memoryPhrases(character.defaultAccessories),
    ...memoryPhrases(character.visualKeywords),
    ...memoryPhrases(character.personalityMemory),
  ];

  const { score, missing } = scorePhrasesAgainstHaystack(haystack, phrases, requiredRatio);

  const warnings: string[] = [];
  const recommendations: string[] = [];

  for (const phrase of missing) {
    const lower = phrase.toLowerCase();
    if (lower.includes("hat") || lower.includes("apron") || lower.includes("clothing")) {
      warnings.push(`${character.name}: ${phrase} not reflected in generated prompt`);
    } else if (lower.includes("logo") || lower.includes("brand")) {
      warnings.push(`${character.name} branding: ${phrase} missing`);
    } else {
      warnings.push(`${character.name} appearance: ${phrase} missing`);
    }
    recommendations.push(reinforcementRecommendation(character.name, phrase));
  }

  if (character.role === "mascot" && !haystack.includes(character.name.toLowerCase())) {
    warnings.push(`${character.name} mascot identity not clearly referenced in prompt`);
    recommendations.push(`Reinforce ${character.name} mascot identity`);
  }

  if (missing.some((m) => m.toLowerCase().includes("apron"))) {
    warnings.push(`${character.name} apron missing`);
  }
  if (missing.some((m) => m.toLowerCase().includes("hat"))) {
    warnings.push(`${character.name} hat not detected`);
  }

  return {
    characterId: character.id,
    name: character.name,
    score: Math.min(100, Math.max(0, score)),
    warnings,
    recommendations,
  };
}
