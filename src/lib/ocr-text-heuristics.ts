/**
 * Cheap client-side heuristic: likely no readable text → skip OpenAI.
 * Tuned for UI screenshots (high contrast edges, text-like horizontal structure).
 */

export type TextHeuristicResult = {
  likelyHasText: boolean;
  score: number;
  edgeDensity: number;
  contrastScore: number;
};

const ANALYSIS_MAX_SIDE = 256;
const NO_TEXT_EDGE_THRESHOLD = 0.018;
const NO_TEXT_CONTRAST_THRESHOLD = 0.09;
const TEXT_EDGE_THRESHOLD = 0.045;

function luminance(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Analyze RGBA buffer (row-major, 4 bytes per pixel). */
export function analyzeRgbaForText(
  width: number,
  height: number,
  rgba: Uint8ClampedArray
): TextHeuristicResult {
  let edgeSum = 0;
  let edgeCount = 0;
  const histogram = new Array<number>(32).fill(0);
  const step = Math.max(1, Math.floor(Math.min(width, height) / 64));

  for (let y = step; y < height - step; y += step) {
    for (let x = step; x < width - step; x += step) {
      const i = (y * width + x) * 4;
      const lum = luminance(rgba[i], rgba[i + 1], rgba[i + 2]);
      const bucket = Math.min(31, Math.floor(lum / 8));
      histogram[bucket] += 1;

      const ir = ((y - step) * width + x) * 4;
      const id = (y * width + (x + step)) * 4;
      const gx = Math.abs(lum - luminance(rgba[ir], rgba[ir + 1], rgba[ir + 2]));
      const gy = Math.abs(lum - luminance(rgba[id], rgba[id + 1], rgba[id + 2]));
      const grad = gx + gy;
      if (grad > 0.08) {
        edgeSum += grad;
        edgeCount += 1;
      }
    }
  }

  const edgeDensity = edgeCount > 0 ? edgeSum / edgeCount : 0;
  const total = histogram.reduce((a, b) => a + b, 0) || 1;
  let contrastScore = 0;
  for (let i = 0; i < histogram.length - 1; i += 1) {
    contrastScore += Math.abs(histogram[i] / total - histogram[i + 1] / total);
  }

  let score = edgeDensity * 4 + contrastScore * 2;
  if (edgeDensity >= TEXT_EDGE_THRESHOLD) {
    score += 0.35;
  }
  if (contrastScore >= 0.14) {
    score += 0.25;
  }

  const likelyHasText =
    edgeDensity >= NO_TEXT_EDGE_THRESHOLD &&
    contrastScore >= NO_TEXT_CONTRAST_THRESHOLD &&
    (edgeDensity >= TEXT_EDGE_THRESHOLD || contrastScore >= 0.12 || score >= 0.55);

  return {
    likelyHasText,
    score,
    edgeDensity,
    contrastScore,
  };
}

export async function estimateLikelyHasTextFromBlob(blob: Blob): Promise<TextHeuristicResult> {
  const bitmap = await createImageBitmap(blob);
  try {
    const long = Math.max(bitmap.width, bitmap.height);
    const scale = long > ANALYSIS_MAX_SIDE ? ANALYSIS_MAX_SIDE / long : 1;
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      return { likelyHasText: true, score: 1, edgeDensity: 1, contrastScore: 1 };
    }
    ctx.drawImage(bitmap, 0, 0, w, h);
    const { data } = ctx.getImageData(0, 0, w, h);
    return analyzeRgbaForText(w, h, data);
  } finally {
    bitmap.close();
  }
}
