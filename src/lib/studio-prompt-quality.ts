import type { PromptBuilderInput, PromptQualityScore, PromptQualityTier } from "@/types/studio-prompt-builder";

function tierFromScore(score: number): PromptQualityTier {
  if (score >= 80) {
    return "strong";
  }
  if (score >= 50) {
    return "good";
  }
  return "weak";
}

export function scorePromptQuality(input: PromptBuilderInput): PromptQualityScore {
  const checks = {
    hasCharacters: input.characters.length > 0,
    hasLocation: input.location !== null,
    hasAction: input.scene.action.trim().length > 0,
    hasEmotion: input.scene.emotion.trim().length > 0,
    hasCamera: input.scene.camera.trim().length > 0,
  };

  const weights = [20, 20, 20, 20, 20];
  const values = [
    checks.hasCharacters,
    checks.hasLocation,
    checks.hasAction,
    checks.hasEmotion,
    checks.hasCamera,
  ];

  let score = 0;
  for (let i = 0; i < values.length; i++) {
    if (values[i]) {
      score += weights[i]!;
    }
  }

  return {
    score,
    tier: tierFromScore(score),
    checks,
  };
}
