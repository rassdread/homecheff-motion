import type { WorldVisionResult } from "@/types/studio-vision-consistency";
import type { WorldMemorySnapshot } from "@/types/studio-memory-snapshots";
import type { StudioVisionWorldSignal } from "@/server/studio-vision-providers/types";

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function analyzeWorldVisionConsistency(params: {
  world: WorldMemorySnapshot;
  signal: StudioVisionWorldSignal;
}): WorldVisionResult {
  const { world, signal } = params;
  const warnings: string[] = [];
  const recommendations: string[] = [];

  let score = 100;
  if (!signal.styleMatch) {
    score -= 25;
    warnings.push(`World style mismatch for ${world.name}`);
    recommendations.push(`Match ${world.name} visual style: ${world.visualStyle}`);
  }
  if (!signal.toneMatch) {
    score -= 20;
    warnings.push(`World tone mismatch for ${world.name}`);
    recommendations.push(`Align scene tone with ${world.tone}`);
  }
  if (!signal.colorLanguageMatch) {
    score -= 15;
    warnings.push("World color language inconsistent");
    recommendations.push("Use consistent world color palette and lighting");
  }
  for (const missing of signal.missingElements) {
    score -= 8;
    warnings.push(`World rule not reflected: ${missing}`);
    recommendations.push(`Apply world rule: ${missing}`);
  }

  return {
    score: clampScore(score),
    warnings,
    recommendations,
    detectedElements: signal.detectedElements,
  };
}
