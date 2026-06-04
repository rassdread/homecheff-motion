import { scoreToCharacterIdentityStatus } from "@/lib/studio-character-identity-status";
import { requiredPhraseMatchRatio } from "@/lib/studio-consistency-text-signals";
import type { CharacterConsistencyResult } from "@/types/studio-consistency";
import type {
  CharacterIdentityScore,
  CharacterIdentityScoreFactors,
} from "@/types/studio-character-consistency";
import type { CharacterVisionResult } from "@/types/studio-vision-consistency";
import type { CharacterMemorySnapshot } from "@/types/studio-memory-snapshots";

function clamp(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function memoryAnchorScore(character: CharacterMemorySnapshot): number {
  const hasMemory = Boolean(
    (character.appearanceMemory ?? "").trim() ||
      (character.defaultClothing ?? "").trim() ||
      (character.defaultAccessories ?? "").trim() ||
      (character.referenceImageUrl ?? "").trim()
  );
  if (!hasMemory) {
    return 70;
  }
  const strictness = requiredPhraseMatchRatio(character.identityStrength);
  return clamp(85 + strictness * 10);
}

export function computeCharacterIdentityScore(params: {
  character: CharacterMemorySnapshot;
  consistencyResult: CharacterConsistencyResult | null;
  visionResult: CharacterVisionResult | null;
  expectedInScene: boolean;
  presentInScene: boolean;
}): CharacterIdentityScore {
  const { character, consistencyResult, visionResult, expectedInScene, presentInScene } = params;
  const warnings: string[] = [];

  const consistencyScore = consistencyResult?.score ?? null;
  const visionScore = visionResult?.score ?? null;
  const memoryMatchScore = memoryAnchorScore(character);
  const referenceAnchored = Boolean(
    (character.referenceImageUrl ?? "").trim() && (visionResult?.referenceCompared ?? false)
  );

  if (expectedInScene && !presentInScene) {
    warnings.push(`${character.name} expected in scene but not detected in analysis.`);
  }
  if (consistencyResult) {
    warnings.push(...consistencyResult.warnings);
  }
  if (visionResult) {
    for (const w of visionResult.warnings) {
      if (!warnings.includes(w)) {
        warnings.push(w);
      }
    }
  }

  let score: number;
  if (!presentInScene && expectedInScene) {
    score = 25;
  } else if (!presentInScene) {
    score = 50;
  } else {
    const weights: Array<{ value: number; weight: number }> = [];
    if (visionScore !== null) {
      weights.push({ value: visionScore, weight: 0.42 });
    }
    if (consistencyScore !== null) {
      weights.push({ value: consistencyScore, weight: 0.33 });
    }
    weights.push({ value: memoryMatchScore, weight: 0.15 });
    if (referenceAnchored) {
      weights.push({ value: 92, weight: 0.1 });
    }
    const totalWeight = weights.reduce((s, w) => s + w.weight, 0);
    score =
      totalWeight > 0
        ? weights.reduce((s, w) => s + w.value * w.weight, 0) / totalWeight
        : memoryMatchScore;
    if (character.role === "mascot" && (visionScore ?? 100) < 70) {
      score -= 8;
      warnings.push(`${character.name} mascot identity may be drifting.`);
    }
  }

  const factors: CharacterIdentityScoreFactors = {
    consistencyScore,
    visionScore,
    memoryMatchScore,
    referenceAnchored,
    expectedInScene,
    presentInScene,
  };

  return {
    characterId: character.id,
    name: character.name,
    score: clamp(score),
    status: scoreToCharacterIdentityStatus(clamp(score)),
    factors,
    warnings: [...new Set(warnings)],
  };
}
