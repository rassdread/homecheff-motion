import type { PhotoVideoMotionKind } from "@/lib/photo-video/styles";

export type MotionSample = {
  zoom: number;
  panX: number;
  panY: number;
};

/**
 * Deterministic Ken Burns-style motion. progress is 0..1 within the clip.
 */
export function sampleLocalMotion(
  kind: PhotoVideoMotionKind,
  progress: number,
  strength: number
): MotionSample {
  const t = Math.max(0, Math.min(1, progress));
  const s = Math.max(0, Math.min(0.2, strength));
  if (kind === "none") {
    return { zoom: 1, panX: 0, panY: 0 };
  }
  if (kind === "zoom-in") {
    return { zoom: 1 + s * t, panX: 0, panY: -0.15 * t };
  }
  if (kind === "zoom-out") {
    return { zoom: 1 + s * (1 - t), panX: 0, panY: 0.1 * (1 - t) };
  }
  if (kind === "pan-left") {
    return { zoom: 1 + s * 0.35, panX: 0.55 - 1.1 * t, panY: 0.04 * Math.sin(t * Math.PI) };
  }
  if (kind === "pan-right") {
    return { zoom: 1 + s * 0.35, panX: -0.55 + 1.1 * t, panY: 0.04 * Math.sin(t * Math.PI) };
  }
  if (kind === "pan-up") {
    return { zoom: 1 + s * 0.3, panX: 0, panY: 0.45 - 0.9 * t };
  }
  if (kind === "pan-down") {
    return { zoom: 1 + s * 0.3, panX: 0, panY: -0.45 + 0.9 * t };
  }
  return { zoom: 1 + s * 0.35, panX: -0.55 + 1.1 * t, panY: 0.08 * Math.sin(t * Math.PI) };
}
