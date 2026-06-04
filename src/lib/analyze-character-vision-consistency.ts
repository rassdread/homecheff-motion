import type { CharacterVisionResult } from "@/types/studio-vision-consistency";
import type { CharacterMemorySnapshot } from "@/types/studio-memory-snapshots";
import type { StudioVisionCharacterSignal } from "@/server/studio-vision-providers/types";

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function analyzeCharacterVisionConsistency(params: {
  character: CharacterMemorySnapshot;
  signal: StudioVisionCharacterSignal;
  referenceCompared: boolean;
}): CharacterVisionResult {
  const { character, signal, referenceCompared } = params;
  const warnings: string[] = [];
  const recommendations: string[] = [];
  const detectedElements = [...signal.detectedTraits];

  let score = 100;
  if (!signal.present) {
    score -= 35;
    warnings.push(`${character.name} not clearly present in image`);
    recommendations.push(`Ensure ${character.name} is clearly visible in frame`);
  }
  if (!signal.clothingVisible) {
    score -= 20;
    warnings.push(`${character.name} expected clothing not visible`);
    recommendations.push(`Reinforce ${character.name} clothing (e.g. green HomeCheff apron)`);
  }
  if (!signal.accessoriesVisible) {
    score -= 15;
    warnings.push(`${character.name} accessories missing (hat, tools, etc.)`);
    recommendations.push(`Reinforce ${character.name} accessories such as chef hat`);
  }
  if (character.role === "mascot" && !signal.mascotProportionsOk) {
    score -= 15;
    warnings.push(`${character.name} mascot proportions inconsistent`);
    recommendations.push(`Maintain ${character.name} mascot proportions and identity`);
  }
  for (const trait of signal.missingTraits) {
    if (!warnings.some((w) => w.includes(trait))) {
      warnings.push(`${character.name}: ${trait} not detected visually`);
      recommendations.push(`Make ${trait} clearly visible for ${character.name}`);
    }
  }
  if (signal.missingTraits.some((t) => /hat/i.test(t))) {
    warnings.push(`Chef hat not detected for ${character.name}`);
    recommendations.push("white chef hat clearly visible");
  }
  if (signal.missingTraits.some((t) => /apron/i.test(t))) {
    warnings.push(`Apron not detected for ${character.name}`);
    recommendations.push("maintain green HomeCheff apron");
  }

  return {
    characterId: character.id,
    name: character.name,
    score: clampScore(score),
    warnings,
    recommendations,
    detectedElements,
    referenceCompared,
  };
}
