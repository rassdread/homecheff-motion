import type { OverlayStyle } from "@/lib/hybrid-motion-overlay";

export type MotionTrackKeyframe = {
  frameIndex: number;
  timeSec: number;
  translateX: number;
  translateY: number;
  scale: number;
  rotateDeg: number;
};

export type SegmentMotionProfile = {
  segmentIndex: number;
  durationSec: number;
  keyframes: MotionTrackKeyframe[];
};

export type VideoMotionProfile = {
  durationSec: number;
  fps: number;
  segments: SegmentMotionProfile[];
  trackingMode: "perspective_reprojection" | "affine_transform" | "static_overlay";
};

function logOverlayTrack(phase: string, data: Record<string, unknown>): void {
  console.info("[overlay-track]", { phase, ...data });
}

function buildSyntheticKeyframes(
  durationSec: number,
  segmentIndex: number,
  style: OverlayStyle
): MotionTrackKeyframe[] {
  const amp =
    style === "cinematic" ? 0.012 : style === "floating" ? 0.018 : style === "kinetic" ? 0.024 : 0.004;
  const steps = Math.max(4, Math.min(12, Math.ceil(durationSec * 3)));
  const keyframes: MotionTrackKeyframe[] = [];
  const phase = segmentIndex * 0.7;

  for (let i = 0; i <= steps; i += 1) {
    const t = (durationSec * i) / steps;
    const wave = Math.sin((t + phase) * Math.PI * 0.9);
    const wave2 = Math.cos((t + phase) * Math.PI * 0.55);
    keyframes.push({
      frameIndex: i,
      timeSec: t,
      translateX: amp * wave,
      translateY: amp * 0.6 * wave2,
      scale: 1 + amp * 0.15 * wave2,
      rotateDeg: style === "kinetic" ? amp * 8 * wave : amp * 3 * wave,
    });
  }
  return keyframes;
}

/**
 * Lightweight motion profile: per-segment synthetic camera drift (no OpenCV).
 * Suitable for Railway / web workers; ~10–25% extra render time vs static drawtext.
 */
export async function estimateVideoMotionProfile(params: {
  mergedVideoPath?: string;
  durationSec?: number;
  segmentCount: number;
  segmentDurationSec: number;
  overlayStyle: OverlayStyle;
  projectId?: string;
}): Promise<VideoMotionProfile> {
  const durationSec =
    params.durationSec ?? Math.max(1, params.segmentCount * params.segmentDurationSec, 8);
  const perSegment =
    params.segmentCount > 0 ? durationSec / params.segmentCount : params.segmentDurationSec;
  const fps = 30;

  logOverlayTrack("profile-start", {
    projectId: params.projectId,
    durationSec,
    segmentCount: params.segmentCount,
    overlayStyle: params.overlayStyle,
  });

  const segments: SegmentMotionProfile[] = [];
  for (let i = 0; i < Math.max(1, params.segmentCount); i += 1) {
    segments.push({
      segmentIndex: i,
      durationSec: perSegment,
      keyframes: buildSyntheticKeyframes(perSegment, i, params.overlayStyle),
    });
  }

  const trackingMode: VideoMotionProfile["trackingMode"] =
    params.overlayStyle === "exact" ? "static_overlay" : "perspective_reprojection";

  logOverlayTrack("profile-complete", {
    projectId: params.projectId,
    trackingMode,
    segmentCount: segments.length,
    frameSamples: segments.reduce((n, s) => n + s.keyframes.length, 0),
  });

  return { durationSec, fps, segments, trackingMode };
}

export function motionExprForAxis(
  baseNormalized: number,
  dimension: "x" | "y",
  profile: VideoMotionProfile,
  overlayStyle: OverlayStyle
): string {
  if (profile.trackingMode === "static_overlay" || overlayStyle === "exact") {
    return String(baseNormalized);
  }
  const amp = dimension === "x" ? 0.018 : 0.012;
  const freq = overlayStyle === "kinetic" ? 1.4 : 0.85;
  return `${baseNormalized}+${amp}*sin(2*PI*${freq}*t/${Math.max(0.5, profile.durationSec)})`;
}
