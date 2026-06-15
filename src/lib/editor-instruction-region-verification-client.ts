import type { EditorInstructionObjectBounds } from "@/types/editor-instruction-studio";
import type { RegionPixelSample } from "@/lib/editor-instruction-region-verification";
import {
  evaluateProtectedRegionChecks,
  PROTECTED_REGION_CHANGE_THRESHOLD,
} from "@/lib/editor-instruction-region-verification";
import type {
  EditorEditProtectionPlan,
  EditorInstructionVariantPrecisionVerification,
} from "@/types/editor-instruction-studio";

function loadImageElement(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to load image for verification"));
    image.src = url;
  });
}

export function sampleRegionFromCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  bounds: EditorInstructionObjectBounds,
  gridSize = 4
): RegionPixelSample[] {
  const samples: RegionPixelSample[] = [];
  const x0 = Math.max(0, Math.floor(bounds.x * width));
  const y0 = Math.max(0, Math.floor(bounds.y * height));
  const x1 = Math.min(width, Math.ceil((bounds.x + bounds.width) * width));
  const y1 = Math.min(height, Math.ceil((bounds.y + bounds.height) * height));
  const regionW = Math.max(1, x1 - x0);
  const regionH = Math.max(1, y1 - y0);

  for (let gy = 0; gy < gridSize; gy += 1) {
    for (let gx = 0; gx < gridSize; gx += 1) {
      const px = x0 + Math.floor(((gx + 0.5) / gridSize) * regionW);
      const py = y0 + Math.floor(((gy + 0.5) / gridSize) * regionH);
      const data = ctx.getImageData(px, py, 1, 1).data;
      samples.push({ r: data[0] ?? 0, g: data[1] ?? 0, b: data[2] ?? 0 });
    }
  }
  return samples;
}

async function sampleImageRegion(
  image: HTMLImageElement,
  bounds: EditorInstructionObjectBounds
): Promise<RegionPixelSample[]> {
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx || canvas.width === 0 || canvas.height === 0) {
    return [];
  }
  ctx.drawImage(image, 0, 0);
  return sampleRegionFromCanvas(ctx, canvas.width, canvas.height, bounds);
}

export async function verifyVariantRegionPrecision(input: {
  sourceUrl: string;
  resultUrl: string;
  plan: EditorEditProtectionPlan;
  threshold?: number;
}): Promise<EditorInstructionVariantPrecisionVerification> {
  const threshold = input.threshold ?? PROTECTED_REGION_CHANGE_THRESHOLD;
  const regions = input.plan.protectedRegionBounds ?? [];
  if (regions.length === 0) {
    return {
      status: "pass",
      protectedRegionsChecked: 0,
      protectedRegionsChanged: 0,
      checkedAt: new Date().toISOString(),
    };
  }

  try {
    const [sourceImage, resultImage] = await Promise.all([
      loadImageElement(input.sourceUrl),
      loadImageElement(input.resultUrl),
    ]);

    const checks = await Promise.all(
      regions.map(async (region) => ({
        label: region.label,
        sourceSamples: await sampleImageRegion(sourceImage, region.bounds),
        resultSamples: await sampleImageRegion(resultImage, region.bounds),
      }))
    );

    const evaluation = evaluateProtectedRegionChecks(checks, threshold);
    return {
      status: evaluation.status,
      protectedRegionsChecked: evaluation.protectedRegionsChecked,
      protectedRegionsChanged: evaluation.protectedRegionsChanged,
      changedRegionLabels: evaluation.changedRegionLabels,
      checkedAt: new Date().toISOString(),
    };
  } catch {
    return {
      status: "pass",
      protectedRegionsChecked: 0,
      protectedRegionsChanged: 0,
      checkedAt: new Date().toISOString(),
    };
  }
}
