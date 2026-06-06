/**
 * Cross-storyboard project memory — usage stats for library assets.
 */

export type StudioAssetUsageStats = {
  storyboardCount: number;
  sceneCount: number;
  renderCount: number;
  campaignCount: number;
};

export type StudioVoiceMemoryEntry = {
  profileId: string;
  labelKey: string;
  characterCount: number;
  storyboardCount: number;
};

export type StudioStyleMemoryEntry = {
  promptStyleProfile: string;
  directorProfile: string;
  storyboardCount: number;
};

export type StudioProjectMemorySnapshot = {
  characters: Record<string, StudioAssetUsageStats>;
  locations: Record<string, StudioAssetUsageStats>;
  props: Record<string, StudioAssetUsageStats>;
  worlds: Record<string, StudioAssetUsageStats>;
  voices: StudioVoiceMemoryEntry[];
  styles: StudioStyleMemoryEntry[];
};

export type StudioProjectMemoryResponse = {
  memory: StudioProjectMemorySnapshot;
};
