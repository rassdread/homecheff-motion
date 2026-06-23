/** OpenAI image edit size selection from source aspect ratio. */

export function resolveOpenAiEditSize(width: number, height: number): string {
  const safeW = Math.max(1, Math.round(width));
  const safeH = Math.max(1, Math.round(height));
  const ratio = safeW / safeH;
  if (ratio > 1.2) {
    return "1536x1024";
  }
  if (ratio < 0.8) {
    return "1024x1536";
  }
  return "1024x1024";
}

export function parseOpenAiEditSize(size: string): { width: number; height: number } {
  const [w, h] = size.split("x").map((part) => Number.parseInt(part, 10));
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
    return { width: 1024, height: 1024 };
  }
  return { width: w, height: h };
}
