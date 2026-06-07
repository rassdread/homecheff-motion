/**
 * Cross-storyboard project memory — usage stats for library assets.
 */

import type { ProductionMemoryRecord } from "@/types/studio-production-memory";

export type StudioAssetUsageStats = {
  storyboardCount: number;
  sceneCount: number;
  renderCount: number;
  campaignCount: number;
};

export type StudioVoiceMemoryEntry = {
  profileId: string;
  labelKey: string;
  /** Human-readable clone name when profileId is a clone ref. */
  displayName?: string;
  characterCount: number;
  storyboardCount: number;
};

export type StudioCastMemoryEntry = {
  characterIds: string[];
  storyboardCount: number;
};

export type StudioStyleMemoryEntry = {
  promptStyleProfile: string;
  directorProfile: string;
  storyboardCount: number;
};

export type StudioNarrationAudioMemoryEntry = {
  id: string;
  storyboardId: string;
  displayName: string;
  language: string;
  durationSeconds: number;
};

export type StudioLibraryAudioMemoryEntry = {
  id: string;
  name: string;
  kind: "music" | "sfx";
  storyboardCount: number;
  renderCount: number;
};

export type StudioShotPatternMemoryEntry = {
  shotType: string;
  cameraMovement: string;
  storyboardCount: number;
  sceneCount: number;
};

export type StudioProjectMemorySnapshot = {
  characters: Record<string, StudioAssetUsageStats>;
  locations: Record<string, StudioAssetUsageStats>;
  props: Record<string, StudioAssetUsageStats>;
  worlds: Record<string, StudioAssetUsageStats>;
  voices: StudioVoiceMemoryEntry[];
  /** Recurring multi-character casts (advisory). */
  castCombinations: StudioCastMemoryEntry[];
  narrationAudio: StudioNarrationAudioMemoryEntry[];
  libraryAudio: StudioLibraryAudioMemoryEntry[];
  styles: StudioStyleMemoryEntry[];
  shotPatterns: StudioShotPatternMemoryEntry[];
  /** Per-storyboard production summaries for pattern learning (advisory). */
  productionRecords?: ProductionMemoryRecord[];
};

export type StudioProjectMemoryResponse = {
  memory: StudioProjectMemorySnapshot;
};
