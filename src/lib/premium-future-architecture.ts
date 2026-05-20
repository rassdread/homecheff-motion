/**
 * Phase 9 — future-ready interfaces (stubs; not fully implemented).
 */

export type AlphaLayerPass = {
  layerId: string;
  rgbaUrl: string;
  blendMode: "normal" | "screen" | "add";
  opacity: number;
};

export interface Live2DMotionRig {
  readonly kind: "live2d_stub";
  rigId: string;
  parameterMap: Record<string, number>;
}

export interface FaceExpressionController {
  readonly kind: "expression_stub";
  preset: "neutral" | "happy" | "excited" | "surprised" | "focused";
  intensity: number;
  /** Future: eye gaze target in normalized coords */
  eyeTrack?: { x: number; y: number };
}

export interface EmotionSystemController {
  readonly kind: "emotion_system_stub";
  baseEmotion: string;
  intensity: number;
  /** Future: layered emotion blend weights */
  blend?: Record<string, number>;
}

export interface DepthMapPass {
  readonly kind: "depth_stub";
  depthUrl?: string;
  parallaxStrength: number;
}

export interface SpeechSyncTimeline {
  readonly kind: "speech_sync_stub";
  audioUrl?: string;
  visemeTrack?: unknown;
}

export interface TransparentFxPass {
  readonly kind: "transparent_fx_stub";
  fxLayerUrl?: string;
  maskUrl?: string;
}

export type FutureMotionPipelineCapabilities = {
  alphaLayers: boolean;
  live2dRig: boolean;
  faceExpression: boolean;
  emotionSystem: boolean;
  depthMaps: boolean;
  speechSync: boolean;
  transparentFx: boolean;
  poseVariation: boolean;
};

export const FUTURE_MOTION_CAPABILITIES: FutureMotionPipelineCapabilities = {
  alphaLayers: false,
  live2dRig: false,
  /** Prompt-layer facial acting via premium-facial-acting.ts (Vidu-directed). */
  faceExpression: true,
  /** Prompt-layer emotion + motion memory (not rig-driven). */
  emotionSystem: true,
  depthMaps: false,
  speechSync: false,
  transparentFx: false,
  /** Prompt-layer gesture variation + motion memory beats. */
  poseVariation: true,
};

export function createLive2DRigStub(rigId: string): Live2DMotionRig {
  return { kind: "live2d_stub", rigId, parameterMap: {} };
}

export function createFaceExpressionStub(
  preset: FaceExpressionController["preset"] = "happy"
): FaceExpressionController {
  return { kind: "expression_stub", preset, intensity: 0.5 };
}

export function createEmotionSystemStub(baseEmotion = "expressive"): EmotionSystemController {
  return { kind: "emotion_system_stub", baseEmotion, intensity: 0.6 };
}

export function logFutureCapabilityAttempt(feature: keyof FutureMotionPipelineCapabilities): void {
  console.info("[premium-future]", {
    feature,
    available: FUTURE_MOTION_CAPABILITIES[feature],
    message: "stub_only",
  });
}
