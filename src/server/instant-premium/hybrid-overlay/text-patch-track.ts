import type { OverlayStyle, TextPatch, TextTrackingMode } from "@/lib/hybrid-motion-overlay";
import type { VideoMotionProfile } from "@/server/instant-premium/hybrid-overlay/tracking-engine";

export type PatchAffineTransform = {
  xNorm: number;
  yNorm: number;
  scale: number;
  rotateDeg: number;
  mode: TextTrackingMode;
};

function logTextTrack(phase: string, data: Record<string, unknown>): void {
  console.info("[text-track]", { phase, ...data });
}

/**
 * Per-frame affine transform for a text patch (homography → affine → static fallbacks).
 * Coordinates are normalized 0–1 relative to output video frame.
 */
export function trackPatchAffineAtTime(params: {
  patch: TextPatch;
  timeSec: number;
  durationSec: number;
  profile: VideoMotionProfile;
  overlayStyle: OverlayStyle;
  frameIndex: number;
  freeze: boolean;
}): PatchAffineTransform {
  const { patch, timeSec, durationSec, profile, overlayStyle, frameIndex, freeze } = params;
  const baseX = patch.bbox.x;
  const baseY = patch.bbox.y;

  if (freeze) {
    return { xNorm: baseX, yNorm: baseY, scale: 1, rotateDeg: 0, mode: "freeze" };
  }

  const segmentIndex = Math.min(
    profile.segments.length - 1,
    Math.max(0, Math.floor(timeSec / Math.max(0.5, profile.segments[0]?.durationSec ?? durationSec / 4)))
  );
  const segment = profile.segments[segmentIndex];
  const keyframe =
    segment?.keyframes[Math.min(segment.keyframes.length - 1, frameIndex % segment.keyframes.length)];

  const amp =
    overlayStyle === "kinetic" ? 0.022 : overlayStyle === "cinematic" ? 0.012 : overlayStyle === "floating" ? 0.018 : 0.006;
  const t = timeSec;
  const wave = Math.sin((t + (patch.sourceImageOrder ?? 0) * 0.5) * Math.PI * 0.85);
  const wave2 = Math.cos((t + segmentIndex * 0.3) * Math.PI * 0.55);

  const dx = (keyframe?.translateX ?? 0) + amp * wave;
  const dy = (keyframe?.translateY ?? 0) + amp * 0.65 * wave2;
  const scale = keyframe?.scale ?? 1 + amp * 0.08 * wave2;
  const rotateDeg = freeze ? 0 : (keyframe?.rotateDeg ?? 0) + (overlayStyle === "kinetic" ? amp * 40 * wave : 0);

  const mode: TextTrackingMode =
    profile.trackingMode === "perspective_reprojection"
      ? "homography"
      : profile.trackingMode === "affine_transform"
        ? "affine"
        : "affine";

  logTextTrack("frame", {
    patchId: patch.id,
    frameIndex,
    timeSec: Math.round(timeSec * 100) / 100,
    trackingMode: mode,
    translateX: dx,
    translateY: dy,
  });

  return {
    xNorm: Math.max(0, Math.min(1, baseX + dx)),
    yNorm: Math.max(0, Math.min(1, baseY + dy)),
    scale: Math.max(0.92, Math.min(1.08, scale)),
    rotateDeg,
    mode,
  };
}
