import type { PhotoVideoRatio } from "@/lib/photo-video/constants";
import { PHOTO_VIDEO_PREVIEW_MAX_EDGE } from "@/lib/photo-video/constants";

export type CanvasSize = { width: number; height: number };

function evenPx(value: number): number {
  return Math.max(2, value - (value % 2));
}

export function canvasSizeForRatio(ratio: PhotoVideoRatio, maxEdge = PHOTO_VIDEO_PREVIEW_MAX_EDGE): CanvasSize {
  if (ratio === "9:16") {
    return { width: evenPx(Math.round((maxEdge * 9) / 16)), height: evenPx(maxEdge) };
  }
  if (ratio === "16:9") {
    return { width: evenPx(maxEdge), height: evenPx(Math.round((maxEdge * 9) / 16)) };
  }
  const edge = evenPx(maxEdge);
  return { width: edge, height: edge };
}

/**
 * Cover-fit destination rect. Does not distort.
 * zoom ≥ 1, panX/panY in -1..1 shift the crop.
 */
export function coverFitRect(input: {
  imageWidth: number;
  imageHeight: number;
  canvasWidth: number;
  canvasHeight: number;
  zoom?: number;
  panX?: number;
  panY?: number;
}): { sx: number; sy: number; sw: number; sh: number; dx: number; dy: number; dw: number; dh: number } {
  const zoom = Math.max(1, input.zoom ?? 1);
  const panX = Math.max(-1, Math.min(1, input.panX ?? 0));
  const panY = Math.max(-1, Math.min(1, input.panY ?? 0));
  const scale = Math.max(input.canvasWidth / input.imageWidth, input.canvasHeight / input.imageHeight) * zoom;
  const dw = input.imageWidth * scale;
  const dh = input.imageHeight * scale;
  const extraX = Math.max(0, dw - input.canvasWidth);
  const extraY = Math.max(0, dh - input.canvasHeight);
  const dx = -extraX / 2 + panX * (extraX / 2);
  const dy = -extraY / 2 + panY * (extraY / 2);
  return {
    sx: 0,
    sy: 0,
    sw: input.imageWidth,
    sh: input.imageHeight,
    dx,
    dy,
    dw,
    dh,
  };
}

export type SafeZones = {
  title: { x: number; y: number; width: number; height: number };
  extra: { x: number; y: number; width: number; height: number };
  watermark: { x: number; y: number; size: number; width: number };
};

export function safeZones(canvas: CanvasSize): SafeZones {
  const pad = Math.round(Math.min(canvas.width, canvas.height) * 0.06);
  const titleH = Math.round(canvas.height * 0.14);
  const extraH = Math.round(canvas.height * 0.1);
  const mark = Math.round(Math.min(canvas.width, canvas.height) * 0.09);
  const lockupW = Math.round(mark * 3.35);
  return {
    title: { x: pad, y: pad, width: canvas.width - pad * 2 - mark * 0.2, height: titleH },
    extra: {
      x: pad,
      y: pad + titleH + Math.round(pad * 0.25),
      width: canvas.width - pad * 2 - lockupW,
      height: extraH,
    },
    watermark: {
      x: canvas.width - pad - lockupW,
      y: canvas.height - pad - mark,
      size: mark,
      width: lockupW,
    },
  };
}
