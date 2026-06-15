export type RegionPixelSample = { r: number; g: number; b: number };

export const PROTECTED_REGION_CHANGE_THRESHOLD = 18;

export function averageColor(samples: RegionPixelSample[]): RegionPixelSample {
  if (samples.length === 0) {
    return { r: 0, g: 0, b: 0 };
  }
  const total = samples.reduce(
    (acc, sample) => ({
      r: acc.r + sample.r,
      g: acc.g + sample.g,
      b: acc.b + sample.b,
    }),
    { r: 0, g: 0, b: 0 }
  );
  return {
    r: total.r / samples.length,
    g: total.g / samples.length,
    b: total.b / samples.length,
  };
}

export function colorDistance(a: RegionPixelSample, b: RegionPixelSample): number {
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
}

export function regionChangedBeyondThreshold(
  sourceSamples: RegionPixelSample[],
  resultSamples: RegionPixelSample[],
  threshold = PROTECTED_REGION_CHANGE_THRESHOLD
): boolean {
  if (sourceSamples.length === 0 || resultSamples.length === 0) {
    return false;
  }
  return (
    colorDistance(averageColor(sourceSamples), averageColor(resultSamples)) > threshold
  );
}

export type ProtectedRegionCheckInput = {
  label: string;
  sourceSamples: RegionPixelSample[];
  resultSamples: RegionPixelSample[];
};

export function evaluateProtectedRegionChecks(
  regions: ProtectedRegionCheckInput[],
  threshold = PROTECTED_REGION_CHANGE_THRESHOLD
): {
  status: "pass" | "low_precision";
  protectedRegionsChecked: number;
  protectedRegionsChanged: number;
  changedRegionLabels: string[];
} {
  const changedRegionLabels: string[] = [];
  for (const region of regions) {
    if (regionChangedBeyondThreshold(region.sourceSamples, region.resultSamples, threshold)) {
      changedRegionLabels.push(region.label);
    }
  }
  return {
    status: changedRegionLabels.length > 0 ? "low_precision" : "pass",
    protectedRegionsChecked: regions.length,
    protectedRegionsChanged: changedRegionLabels.length,
    changedRegionLabels,
  };
}
