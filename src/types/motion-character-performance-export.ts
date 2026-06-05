import type { MouthMovementState } from "@/types/studio-character-performance";

export const MOTION_PERFORMANCE_EXPORT_JSON_VERSION = 1 as const;
export const MOTION_PERFORMANCE_RUNTIME_VERSION = "v34.6" as const;

export type MotionPerformanceBlinkState = "open" | "closed";

/** Per-tick export frame — audio-driven mascot performance (not phoneme lip sync). */
export type MotionCharacterPerformanceFrame = {
  time: number;
  sceneIndex: number;
  characterId: string;
  characterName: string;
  activeSpeaker: boolean;
  mouthState: MouthMovementState;
  mouthOpenAmount: number;
  smileStrength: number;
  blinkState: MotionPerformanceBlinkState;
  headOffsetX: number;
  headOffsetY: number;
  idleOffsetX: number;
  idleOffsetY: number;
  energyMultiplier: number;
  emotionModifier: string;
};

export type MotionPerformanceExportWarning = {
  code: string;
  message: string;
};

/** Persisted on studioHandoffJson.motionPerformanceExport (metadata only; frames rebuilt at export). */
export type MotionStudioPerformanceExportJson = {
  version: typeof MOTION_PERFORMANCE_EXPORT_JSON_VERSION;
  performanceRuntimeVersion: typeof MOTION_PERFORMANCE_RUNTIME_VERSION;
  performanceEnabled: boolean;
  performanceApplied: boolean;
  frameSampleCount: number;
  warnings: MotionPerformanceExportWarning[];
  characterProfileIds: string[];
  lastOverlay?: {
    applied: boolean;
    at: string;
    error?: string | null;
    overlayMode: "mouth_assets" | "debug_indicator";
  };
};

export type MotionPerformanceFramePlan = {
  frames: MotionCharacterPerformanceFrame[];
  warnings: MotionPerformanceExportWarning[];
  enabledCharacterCount: number;
};
