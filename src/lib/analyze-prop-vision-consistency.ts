import type { PropVisionResult } from "@/types/studio-vision-consistency";
import type { PropMemorySnapshot } from "@/types/studio-memory-snapshots";
import type { StudioVisionPropSignal } from "@/server/studio-vision-providers/types";

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function analyzePropVisionConsistency(params: {
  prop: PropMemorySnapshot;
  signal: StudioVisionPropSignal;
  referenceCompared: boolean;
}): PropVisionResult {
  const { prop, signal, referenceCompared } = params;
  const warnings: string[] = [];
  const recommendations: string[] = [];

  let score = 100;
  if (!signal.visible) {
    score -= 40;
    warnings.push(`${prop.name} not visible in image`);
    recommendations.push(`Ensure ${prop.name} is clearly visible in frame`);
  }
  if (!signal.brandingVisible && /logo|brand|homecheff/i.test(prop.brandingRules)) {
    score -= 15;
    warnings.push(`${prop.name} branding not visible`);
    recommendations.push(`Show ${prop.name} with correct HomeCheff branding`);
  }
  for (const missing of signal.missingTraits) {
    score -= 10;
    warnings.push(`${prop.name}: ${missing} not detected`);
    recommendations.push(`Make ${prop.name} (${missing}) clearly visible`);
  }

  return {
    propId: prop.id,
    name: prop.name,
    score: clampScore(score),
    warnings,
    recommendations,
    detectedElements: signal.detectedTraits,
    referenceCompared,
  };
}
