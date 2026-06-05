/** Studio V38 — Audio Asset Director (no generation, no provider integration). */

export const AUDIO_ASSET_CATEGORIES = ["voice", "music", "ambience", "sfx"] as const;

export type AudioAssetCategory = (typeof AUDIO_ASSET_CATEGORIES)[number];

export type StudioAudioAsset = {
  id: string;
  name: string;
  category: AudioAssetCategory;
  description: string;
  tags: string[];
  moodTags: string[];
  energyTags: string[];
  /** Recommended loop or clip duration in seconds (planning only). */
  duration: number;
  language: string | null;
  provider: string;
  licenseType: string;
  isSystemAsset: boolean;
};

export type AssignedAudioAsset = {
  assetId: string;
  assetName: string;
  category: AudioAssetCategory;
  source: "recommended" | "override";
};

export type SceneAudioAssetPackage = {
  sceneId: string;
  order: number;
  title: string;
  arcPhase: string;
  voiceAssets: AssignedAudioAsset[];
  musicAssets: AssignedAudioAsset[];
  ambienceAssets: AssignedAudioAsset[];
  sfxAssets: AssignedAudioAsset[];
  hasUserOverrides: boolean;
};

export type AudioAssetWarning = {
  code: string;
  severity: "info" | "warning";
  messageKey: string;
  params?: Record<string, string | number>;
};

export type AudioAssetPlan = {
  enabled: boolean;
  assetSummary: string;
  scenePackages: SceneAudioAssetPackage[];
  assignedVoiceAssets: StudioAudioAsset[];
  assignedMusicAssets: StudioAudioAsset[];
  assignedSoundAssets: StudioAudioAsset[];
  warnings: AudioAssetWarning[];
  recommendations: string[];
  assetScore: number;
};

/** Motion handoff V18 — audio asset plan (no rendered audio). */
export type MotionAudioAssetHandoffPlan = {
  enabled: boolean;
  assetSummary: string;
  scenePackages: SceneAudioAssetPackage[];
  assignedVoiceAssets: StudioAudioAsset[];
  assignedMusicAssets: StudioAudioAsset[];
  assignedSoundAssets: StudioAudioAsset[];
  assetWarnings: AudioAssetWarning[];
  recommendations: string[];
};

export type MotionSceneAudioAssetHandoff = {
  voiceAssets: AssignedAudioAsset[];
  musicAssets: AssignedAudioAsset[];
  ambienceAssets: AssignedAudioAsset[];
  sfxAssets: AssignedAudioAsset[];
};
