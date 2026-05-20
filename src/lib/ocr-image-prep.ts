/** Max long edge for images sent to OpenAI Vision OCR. */
export const OCR_MAX_LONG_EDGE = 1400;
export const OCR_JPEG_QUALITY = 0.76;

export type OcrPrepResult = {
  blob: Blob;
  width: number;
  height: number;
  sourceBytes: number;
  outputBytes: number;
  durationMs: number;
};

function scaleToMaxLongEdge(width: number, height: number, maxLong: number): { width: number; height: number } {
  const long = Math.max(width, height);
  if (long <= maxLong) {
    return { width, height };
  }
  const scale = maxLong / long;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("ocr_jpeg_encode_failed"));
          return;
        }
        resolve(blob);
      },
      "image/jpeg",
      quality
    );
  });
}

/**
 * Downscale for OCR: long edge ≤1400px, JPEG ~76%, no metadata (canvas re-encode).
 */
export async function prepareOcrBlob(source: Blob): Promise<OcrPrepResult> {
  const started = performance.now();
  const sourceBytes = source.size;
  const bitmap = await createImageBitmap(source);
  try {
    const scaled = scaleToMaxLongEdge(bitmap.width, bitmap.height, OCR_MAX_LONG_EDGE);
    const canvas = document.createElement("canvas");
    canvas.width = scaled.width;
    canvas.height = scaled.height;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) {
      throw new Error("canvas_unavailable");
    }
    ctx.drawImage(bitmap, 0, 0, scaled.width, scaled.height);
    const blob = await canvasToJpeg(canvas, OCR_JPEG_QUALITY);
    return {
      blob,
      width: scaled.width,
      height: scaled.height,
      sourceBytes,
      outputBytes: blob.size,
      durationMs: Math.round(performance.now() - started),
    };
  } finally {
    bitmap.close();
  }
}
