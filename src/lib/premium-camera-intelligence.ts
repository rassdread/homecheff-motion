/**
 * Premium camera intelligence — emotionally-aware cinematic camera pacing.
 */

import type { CameraPresetId } from "@/lib/premium-camera-presets";
import { buildCameraPromptBlock } from "@/lib/premium-camera-presets";
import type { EmotionalActingPresetId } from "@/lib/premium-emotional-presets";
import type { MotionEnergy } from "@/lib/premium-motion-engine";
import type { MotionMemoryState } from "@/lib/premium-motion-memory";
import type { MotionVariationSegmentPhase } from "@/lib/premium-motion-variation";

const CAMERA_SAFETY = `CAMERA SAFETY (non-negotiable):
- No shake spam, random zooming, unstable framing, or aggressive handheld simulation.
- Subtle cinematic timing only — smooth momentum with emotionally-aware pacing.`;

const PHASE_CAMERA_HINTS: Record<MotionVariationSegmentPhase, string> = {
  opening: "Opening camera: gentle establish — slow drift in or stable hero framing; build anticipation.",
  mid: "Mid camera: maintain direction — soft punch or parallax depth on emphasis beat only.",
  closing: "Closing camera: resolve momentum — ease out or hold stable hero; no snap zoom at end.",
};

export function buildCameraIntelligenceBlock(params: {
  cameraPreset: CameraPresetId;
  motionEnergy: MotionEnergy;
  emotionalActingPreset?: EmotionalActingPresetId;
  segmentPhase?: MotionVariationSegmentPhase;
  memory?: MotionMemoryState | null;
}): string {
  const base = buildCameraPromptBlock(params.cameraPreset);
  const parts: string[] = [];

  if (base) {
    parts.push(base);
  }

  parts.push("PREMIUM CAMERA INTELLIGENCE:");
  parts.push(CAMERA_SAFETY);

  if (params.segmentPhase) {
    parts.push(PHASE_CAMERA_HINTS[params.segmentPhase]);
  }

  if (params.memory) {
    parts.push(
      `Camera momentum from prior segments: ${params.memory.cameraDirection.replace(/_/g, " ")} — continue smoothly.`
    );
  }

  if (params.motionEnergy === "cinematic") {
    parts.push("Cinematic pacing: measured push/pull, film-like easing, premium ad rhythm.");
  } else if (params.motionEnergy === "viral") {
    parts.push("Social pacing: one controlled punch-in on hook beat — not continuous zoom.");
  } else if (params.motionEnergy === "calm") {
    parts.push("Calm pacing: near-static framing; micro-drift only.");
  }

  if (params.emotionalActingPreset === "confident_presenter") {
    parts.push("Emotion-aware camera: steady confident framing supports presenter authority.");
  } else if (params.emotionalActingPreset === "playful_mascot") {
    parts.push("Emotion-aware camera: light playful drift syncs with mascot charm — not dizzy motion.");
  }

  return parts.filter(Boolean).join("\n\n");
}
