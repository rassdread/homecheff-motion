export type StudioAudioChangePlanItemStatus =
  | "planned"
  | "ready"
  | "generating"
  | "done"
  | "failed";

export type StudioAudioChangeApplyTarget = "project" | "scene" | "character";

export type StudioAudioAssetKind = "voice" | "music" | "sound_effect";

export type StudioAudioChangePlanItem = {
  id: string;
  kind: StudioAudioAssetKind;
  title: string;
  instruction: string;
  status: StudioAudioChangePlanItemStatus;
  source: "user" | "ai_director" | "generation";
  applyTarget: StudioAudioChangeApplyTarget;
  sceneId?: string;
  sceneIndex?: number;
  characterId?: string;
  voiceProfile?: string;
  voiceId?: string;
  voiceName?: string;
  provider?: string;
  providerAssetId?: string;
  audioUrl?: string;
  previewUrl?: string;
  durationSeconds?: number;
  prompt?: string;
  genre?: string;
  mood?: string;
  instrumental?: boolean;
  sfxCategory?: string;
  estimatedCostCredits?: number;
  order: number;
  selected: boolean;
  createdAt: string;
  errorMessage?: string;
};

export type StudioAudioChangePlan = {
  version: 1;
  storyboardId: string;
  updatedAt: string;
  items: StudioAudioChangePlanItem[];
};

export type StudioAudioProjectAsset = {
  id: string;
  kind: StudioAudioAssetKind;
  provider: string;
  providerAssetId?: string;
  audioUrl?: string;
  previewUrl?: string;
  durationSeconds?: number;
  prompt?: string;
  appliedTo: StudioAudioChangeApplyTarget;
  sceneId?: string;
  characterId?: string;
  voiceProfile?: string;
  libraryAssetId?: string;
  createdAt: string;
};

export type StudioAudioProjectAssetsRegistry = {
  version: 1;
  storyboardId: string;
  updatedAt: string;
  assets: StudioAudioProjectAsset[];
};
