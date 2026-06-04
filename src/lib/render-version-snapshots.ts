/**
 * Snapshots stored on each ProjectRenderVersion for comparison and audit.
 */

import type { AnimationProject, AnimationImage, AnimationTransition } from "@prisma/client";
import { parseInstantSceneTexts } from "@/lib/story-overlay-templates";
import {
  buildVoiceExportRenderSnapshot,
  resolveMotionStudioAudioExport,
} from "@/lib/motion-voice-export";

export type RenderPromptSnapshot = {
  userPrompt: string | null;
  intent: string | null;
  globalPromptContext: string | null;
  instantUserIntent: string | null;
  instantSelectedChips: unknown;
  continuityMode: string | null;
  emotionModeSummary: string | null;
  actingIntensitySummary: string | null;
  capturedAt: string;
};

export type RenderStoryboardSnapshot = {
  instantSceneTexts: unknown;
  sceneCount: number;
};

export type RenderSettingsSnapshot = {
  instantMode: string;
  instantTransitionSeconds: number;
  instantOutputDurationSeconds: number | null;
  instantStoryboardDurationSeconds: number | null;
  stylePreset: string | null;
  aspectRatio: string | null;
  presetId: string;
  instantLockedTextMode: boolean;
  instantTextRenderMode: string;
  instantHybridOverlayStyle: string;
  languageTextLayersJson: unknown;
  /** V32: Studio voice/subtitle export snapshot when present. */
  studioVoiceExport?: unknown;
};

export type RenderSegmentSnapshotEntry = {
  order: number;
  transitionId: string;
  status: string;
  outputVideoUrl: string | null;
  providerJobId: string | null;
};

export function buildRenderPromptSnapshot(
  project: Pick<
    AnimationProject,
    | "userPrompt"
    | "intent"
    | "globalPromptContext"
    | "instantUserIntent"
    | "instantSelectedChips"
    | "instantSceneTexts"
  >
): RenderPromptSnapshot {
  const scenes = parseInstantSceneTexts(project.instantSceneTexts);
  const emotionModes = scenes.map((s) => s.emotionMode ?? "auto");
  const intensities = scenes.map((s) => s.actingIntensity ?? "active");
  const continuity =
    typeof project.instantUserIntent === "string" &&
    project.instantUserIntent.includes("[hc_story_continuity:")
      ? project.instantUserIntent.match(/\[hc_story_continuity:([^\]]+)\]/)?.[1] ?? "default"
      : "default";

  return {
    userPrompt: project.userPrompt,
    intent: project.intent,
    globalPromptContext: project.globalPromptContext,
    instantUserIntent: project.instantUserIntent,
    instantSelectedChips: project.instantSelectedChips,
    continuityMode: continuity,
    emotionModeSummary: emotionModes.join(","),
    actingIntensitySummary: intensities.join(","),
    capturedAt: new Date().toISOString(),
  };
}

export function buildRenderStoryboardSnapshot(
  project: Pick<AnimationProject, "instantSceneTexts">
): RenderStoryboardSnapshot {
  const scenes = parseInstantSceneTexts(project.instantSceneTexts);
  return {
    instantSceneTexts: scenes,
    sceneCount: scenes.length,
  };
}

export function buildRenderSettingsSnapshot(
  project: Pick<
    AnimationProject,
    | "instantMode"
    | "instantTransitionSeconds"
    | "instantOutputDurationSeconds"
    | "instantStoryboardDurationSeconds"
    | "stylePreset"
    | "aspectRatio"
    | "presetId"
    | "instantLockedTextMode"
    | "instantTextRenderMode"
    | "instantHybridOverlayStyle"
    | "languageTextLayersJson"
    | "studioHandoffJson"
  >
): RenderSettingsSnapshot {
  const voiceExport = buildVoiceExportRenderSnapshot(
    resolveMotionStudioAudioExport({ studioHandoffJson: project.studioHandoffJson })
  );
  return {
    instantMode: project.instantMode,
    instantTransitionSeconds: project.instantTransitionSeconds,
    instantOutputDurationSeconds: project.instantOutputDurationSeconds,
    instantStoryboardDurationSeconds: project.instantStoryboardDurationSeconds,
    stylePreset: project.stylePreset,
    aspectRatio: project.aspectRatio,
    presetId: project.presetId,
    instantLockedTextMode: project.instantLockedTextMode,
    instantTextRenderMode: project.instantTextRenderMode,
    instantHybridOverlayStyle: project.instantHybridOverlayStyle,
    languageTextLayersJson: project.languageTextLayersJson,
    ...(voiceExport ? { studioVoiceExport: voiceExport } : {}),
  };
}

export function buildRenderSegmentSnapshot(
  transitions: Array<
    Pick<AnimationTransition, "id" | "order" | "status" | "outputVideoUrl" | "providerJobId">
  >
): RenderSegmentSnapshotEntry[] {
  return transitions.map((t) => ({
    order: t.order,
    transitionId: t.id,
    status: t.status,
    outputVideoUrl: t.outputVideoUrl,
    providerJobId: t.providerJobId,
  }));
}

export function buildRenderImageSetFingerprint(images: Array<Pick<AnimationImage, "id" | "order">>): string {
  return images
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((img) => `${img.order}:${img.id}`)
    .join("|");
}

export type RenderVersionDiffLine = {
  field: string;
  before: string;
  after: string;
};

export function diffRenderSnapshots(
  a: {
    promptSnapshot: unknown;
    storyboardSnapshot: unknown;
    settingsSnapshot: unknown;
  },
  b: {
    promptSnapshot: unknown;
    storyboardSnapshot: unknown;
    settingsSnapshot: unknown;
  }
): RenderVersionDiffLine[] {
  const lines: RenderVersionDiffLine[] = [];
  const push = (field: string, before: unknown, after: unknown) => {
    const bStr = JSON.stringify(before ?? null);
    const aStr = JSON.stringify(after ?? null);
    if (bStr !== aStr) {
      lines.push({ field, before: bStr, after: aStr });
    }
  };

  const pa = a.promptSnapshot as RenderPromptSnapshot;
  const pb = b.promptSnapshot as RenderPromptSnapshot;
  if (pa && pb) {
    push("prompt.userIntent", pa.instantUserIntent, pb.instantUserIntent);
    push("prompt.emotionModes", pa.emotionModeSummary, pb.emotionModeSummary);
    push("prompt.actingIntensity", pa.actingIntensitySummary, pb.actingIntensitySummary);
    push("prompt.continuity", pa.continuityMode, pb.continuityMode);
  }

  const sa = a.settingsSnapshot as RenderSettingsSnapshot;
  const sb = b.settingsSnapshot as RenderSettingsSnapshot;
  if (sa && sb) {
    push("settings.transitionSeconds", sa.instantTransitionSeconds, sb.instantTransitionSeconds);
    push("settings.mode", sa.instantMode, sb.instantMode);
    push("settings.stylePreset", sa.stylePreset, sb.stylePreset);
  }

  const ta = a.storyboardSnapshot as RenderStoryboardSnapshot;
  const tb = b.storyboardSnapshot as RenderStoryboardSnapshot;
  if (ta && tb) {
    push("storyboard.sceneCount", ta.sceneCount, tb.sceneCount);
    push("storyboard.texts", ta.instantSceneTexts, tb.instantSceneTexts);
  }

  return lines;
}
