/**
 * Story Mode render debug — gated by HC_STORY_MODE_DEBUG=1 (server logs only).
 */

import type { AnimationSceneEmotionId, SceneActingIntensity } from "@/lib/animation-scene-emotions";
import type { StoryContinuityStrength } from "@/lib/story-character-continuity";
import type { ResolvedSceneTemplate } from "@/lib/story-overlay-templates";

export function isStoryModeDebugEnabled(): boolean {
  const v = process.env.HC_STORY_MODE_DEBUG;
  return v === "1" || v === "true";
}

export type StoryOverlayLayerKind =
  | "hero"
  | "headline"
  | "title"
  | "subtitle"
  | "extra"
  | "sequence_line"
  | "hero_finale"
  | "finale_footer";

export type StoryOverlayPlacementDecision = {
  layer: StoryOverlayLayerKind;
  zoneId?: string;
  x: number;
  y: number;
  action: "kept" | "moved" | "hidden" | "resized";
  reason: string;
};

export type StorySafeZoneDebugEntry = {
  zoneId: string;
  score: number;
  objectOverlapPct?: number;
};

export type StorySceneDebugEntry = {
  sceneId?: string;
  sceneIndex: number;
  imageId?: string;
  imageOrder?: number;
  resolvedEmotion: AnimationSceneEmotionId;
  emotionMode: "auto" | "manual";
  actingIntensity: SceneActingIntensity;
  storyCharacterRole?: string;
  overlayTemplate: ResolvedSceneTemplate | "skip";
  overlayTextBlocks: Array<{ kind: StoryOverlayLayerKind; text: string }>;
  overlayPositions: StoryOverlayPlacementDecision[];
  ocrBoxes: Array<{ x: number; y: number; width: number; height: number; label?: string }>;
  faceSafeZones: Array<{ x: number; y: number; width: number; height: number; type: string }>;
  objectSafeZones: Array<{ x: number; y: number; width: number; height: number; label: string }>;
  collisionWarnings: string[];
};

export type StoryModeDebugReport = {
  capturedAt: string;
  projectId: string;
  transitionId?: string;
  storyModeEnabled: boolean;
  imageCount: number;
  imageOrder: Array<{ imageId: string; order: number }>;
  continuityStrength: StoryContinuityStrength;
  characterContinuityBlock: string;
  finalViduPrompt: string;
  finalViduPromptChars: number;
  promptBudget?: {
    truncatedBlocks: string[];
    droppedBlocks: string[];
  };
  scenes: StorySceneDebugEntry[];
};

const reportStore = new Map<string, StoryModeDebugReport>();

export function stashStoryModeDebugReport(projectId: string, report: StoryModeDebugReport): void {
  if (!isStoryModeDebugEnabled()) {
    return;
  }
  reportStore.set(projectId, report);
}

export function peekStoryModeDebugReport(projectId: string): StoryModeDebugReport | undefined {
  return reportStore.get(projectId);
}

export function logStoryModeDebugReport(report: StoryModeDebugReport): void {
  if (!isStoryModeDebugEnabled()) {
    return;
  }
  console.info("[hc-story-mode-debug]", JSON.stringify(report, null, 2));
}

export function createEmptyStoryModeDebugReport(params: {
  projectId: string;
  transitionId?: string;
  imageCount: number;
  imageOrder: Array<{ imageId: string; order: number }>;
}): StoryModeDebugReport {
  return {
    capturedAt: new Date().toISOString(),
    projectId: params.projectId,
    transitionId: params.transitionId,
    storyModeEnabled: true,
    imageCount: params.imageCount,
    imageOrder: params.imageOrder,
    continuityStrength: "strict",
    characterContinuityBlock: "",
    finalViduPrompt: "",
    finalViduPromptChars: 0,
    scenes: [],
  };
}
