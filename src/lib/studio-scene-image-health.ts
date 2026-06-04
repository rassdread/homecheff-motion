import { scorePromptQuality } from "@/lib/studio-prompt-quality";
import { sceneSnapshotToPromptInput } from "@/lib/studio-scene-to-prompt-input";
import type { StudioSceneImageHealth, StudioSceneImageHealthTier } from "@/types/studio-scene-image";
import type { SceneSnapshot } from "@/types/studio-scene-snapshot";
import type { StudioPromptStyleProfile } from "@/lib/studio-prompt-style-profiles";
import type { StudioSceneImageStatus } from "@/types/studio-scene-image";

function tierFromScore(score: number): StudioSceneImageHealthTier {
  if (score >= 80) {
    return "strong";
  }
  if (score >= 50) {
    return "good";
  }
  return "weak";
}

export function scoreSceneImageHealth(params: {
  scene: SceneSnapshot;
  styleProfile: StudioPromptStyleProfile | string;
  latestImageStatus?: StudioSceneImageStatus | null;
}): StudioSceneImageHealth {
  const promptQuality = scorePromptQuality(sceneSnapshotToPromptInput(params.scene, params.styleProfile));
  const generationSucceeded = params.latestImageStatus === "completed";

  let score = Math.round(promptQuality.score * 0.7);
  if (generationSucceeded) {
    score += 30;
  } else if (params.latestImageStatus === "generating" || params.latestImageStatus === "queued") {
    score += 10;
  }

  score = Math.min(100, Math.max(0, score));

  return {
    score,
    tier: tierFromScore(score),
    promptQualityScore: promptQuality.score,
    generationSucceeded,
  };
}
