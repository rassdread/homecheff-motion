import type { BrandingVisionResult } from "@/types/studio-vision-consistency";
import type { StudioVisionBrandingSignal } from "@/server/studio-vision-providers/types";

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function analyzeBrandingConsistency(
  signal: StudioVisionBrandingSignal
): BrandingVisionResult {
  const warnings: string[] = [];
  const recommendations: string[] = [];

  let score = 100;
  if (!signal.homecheffLogoVisible) {
    score -= 35;
    warnings.push("HomeCheff globe logo not visible");
    recommendations.push("Reinforce HomeCheff globe logo placement in scene");
  }
  if (!signal.logoPlacementOk) {
    score -= 20;
    warnings.push("Logo placement does not match brand guidelines");
    recommendations.push("Place HomeCheff logo in approved visible area");
  }
  if (!signal.brandedPackagingVisible && signal.missingElements.some((m) => /packaging|mug|cup/i.test(m))) {
    score -= 15;
    warnings.push("Branded packaging not detected");
    recommendations.push("Include branded packaging or HomeCheff mug clearly visible");
  }
  for (const missing of signal.missingElements) {
    if (!warnings.some((w) => w.includes(missing))) {
      warnings.push(`Branding element missing: ${missing}`);
      recommendations.push(`Reinforce ${missing} in frame`);
    }
  }

  return {
    score: clampScore(score),
    warnings,
    recommendations,
    detectedElements: [
      ...signal.detectedElements,
      ...(signal.homecheffLogoVisible ? ["HomeCheff logo"] : []),
    ],
  };
}
