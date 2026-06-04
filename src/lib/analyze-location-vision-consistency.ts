import type { LocationVisionResult } from "@/types/studio-vision-consistency";
import type { LocationMemorySnapshot } from "@/types/studio-memory-snapshots";
import type { StudioVisionLocationSignal } from "@/server/studio-vision-providers/types";

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function analyzeLocationVisionConsistency(params: {
  location: LocationMemorySnapshot;
  signal: StudioVisionLocationSignal;
  referenceCompared: boolean;
}): LocationVisionResult {
  const { location, signal, referenceCompared } = params;
  const warnings: string[] = [];
  const recommendations: string[] = [];

  let score = 100;
  if (!signal.visualIdentityMatch) {
    score -= 25;
    warnings.push(`${location.name} visual identity does not match memory`);
    recommendations.push(`Reinforce ${location.name} visual identity in scene`);
  }
  if (!signal.worldCharacteristicsMatch) {
    score -= 20;
    warnings.push(`${location.name} world characteristics weak`);
    recommendations.push(`Show ${location.name} environment characteristics clearly`);
  }
  for (const missing of signal.missingElements) {
    score -= 8;
    warnings.push(`Location element missing: ${missing}`);
    recommendations.push(`Include ${missing} in ${location.name} scene`);
  }
  if (signal.environmentElements.length === 0 && signal.missingElements.length > 0) {
    warnings.push("Expected environment elements not detected");
    recommendations.push("Reinforce garden beds, market stalls, or location-specific elements");
  }

  return {
    score: clampScore(score),
    warnings,
    recommendations,
    detectedElements: signal.environmentElements,
    referenceCompared,
  };
}
