import type { StudioCharacterRole } from "@/lib/studio-character-roles";
import type { StudioContinuityStrength } from "@/lib/studio-continuity-strength";
import type { StudioIdentityStrength } from "@/lib/studio-memory-validation";
import type { StudioLocationCategory } from "@/lib/studio-location-categories";
import type { StudioPropCategory } from "@/lib/studio-prop-categories";
import type { StudioDirectorProfile } from "@/lib/studio-director-profiles";
import type { StudioPromptStyleProfile } from "@/lib/studio-prompt-style-profiles";
import type { StoryboardAudioAssetLinks } from "@/types/studio-user-audio-library";
import type { StudioSceneEnergy } from "@/lib/studio-scene-director";
import type { StudioSceneImageListItem } from "@/types/studio-scene-image";

export type StudioWorldProfileSummary = {
  id: string;
  name: string;
};

export type StudioWorldProfileListItem = {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  description: string;
  visualStyle: string;
  tone: string;
  continuityRules: string;
  continuityStrength: StudioContinuityStrength;
  createdAt: string;
  updatedAt: string;
  ownerEmail?: string;
};

export type StudioWorldProfileDetail = StudioWorldProfileListItem;

export type StudioWorldProfileListResponse = {
  worlds: StudioWorldProfileListItem[];
};

export type StudioWorldProfileDetailResponse = {
  world: StudioWorldProfileDetail;
};

export type StudioCharacterListItem = {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  role: StudioCharacterRole;
  description: string;
  personality: string;
  referenceImageUrl: string;
  isMascot: boolean;
  appearanceMemory: string;
  personalityMemory: string;
  continuityNotes: string;
  defaultClothing: string;
  defaultAccessories: string;
  visualKeywords: string;
  primaryReferenceImageId: string | null;
  referenceNotes: string;
  identityStrength: StudioIdentityStrength;
  continuityStrength: StudioContinuityStrength;
  worldProfileId: string | null;
  worldProfile: StudioWorldProfileSummary | null;
  voiceEnabled: boolean;
  voiceProvider: string;
  voiceProfile: string;
  voiceLanguage: string;
  voiceGender: string;
  voiceDescription: string;
  voiceNotes: string;
  voiceLock: boolean;
  voiceProfilesByLanguage: import("@/types/studio-character-voice").CharacterVoiceProfilesByLanguage;
  performanceEnabled: boolean;
  defaultSmileStrength: number;
  defaultBlinkRate: string;
  defaultHeadMovement: string;
  defaultMouthIntensity: string;
  idleAnimationStyle: string;
  performanceNotes: string;
  mouthAnimationEnabled: boolean;
  mouthClosedAssetUrl: string;
  mouthSmallAssetUrl: string;
  mouthMediumAssetUrl: string;
  mouthWideAssetUrl: string;
  createdAt: string;
  updatedAt: string;
  ownerEmail?: string;
};

export type StudioCharacterDetail = StudioCharacterListItem & {
  referenceStorageKey: string;
  isSystemCharacter: boolean;
};

export type StudioCharacterListResponse = {
  characters: StudioCharacterListItem[];
};

export type StudioCharacterDetailResponse = {
  character: StudioCharacterDetail;
};

export type StudioLocationListItem = {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  category: StudioLocationCategory;
  description: string;
  referenceImageUrl: string;
  worldMemory: string;
  visualIdentity: string;
  environmentKeywords: string;
  continuityNotes: string;
  continuityStrength: StudioContinuityStrength;
  worldProfileId: string | null;
  worldProfile: StudioWorldProfileSummary | null;
  createdAt: string;
  updatedAt: string;
  ownerEmail?: string;
};

export type StudioLocationDetail = StudioLocationListItem & {
  referenceStorageKey: string;
  isSystemLocation: boolean;
};

export type StudioLocationListResponse = {
  locations: StudioLocationListItem[];
};

export type StudioLocationDetailResponse = {
  location: StudioLocationDetail;
};

export type StudioPropListItem = {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  category: StudioPropCategory;
  description: string;
  referenceImageUrl: string;
  appearanceMemory: string;
  brandingRules: string;
  continuityNotes: string;
  continuityStrength: StudioContinuityStrength;
  worldProfileId: string | null;
  worldProfile: StudioWorldProfileSummary | null;
  createdAt: string;
  updatedAt: string;
  ownerEmail?: string;
};

export type StudioPropDetail = StudioPropListItem & {
  referenceStorageKey: string;
  isSystemProp: boolean;
};

export type StudioPropListResponse = {
  props: StudioPropListItem[];
};

export type StudioPropDetailResponse = {
  prop: StudioPropDetail;
};

export type StudioSceneDetail = {
  id: string;
  storyboardId: string;
  order: number;
  title: string;
  description: string;
  action: string;
  emotion: string;
  camera: string;
  shotType: string;
  cameraMovement: string;
  sceneEnergy: StudioSceneEnergy;
  transitionToNext: string;
  musicCueType: string;
  musicEnergyTarget: string;
  musicTransitionType: string;
  musicStartBehavior: string;
  musicEndBehavior: string;
  soundEnvironmentOverride: string;
  soundCharacterOverride: string;
  soundPropOverride: string;
  soundTransitionOverride: string;
  soundAmbientOverride: string;
  voicePriority: string;
  musicPriority: string;
  soundPriority: string;
  audioFocus: string;
  duckingMode: string;
  voiceAssetOverride: string;
  musicAssetOverride: string;
  ambienceAssetOverride: string;
  sfxAssetOverride: string;
  durationSeconds: number;
  locationId: string | null;
  location: StudioLocationListItem | null;
  characters: StudioCharacterListItem[];
  props: StudioPropListItem[];
  selectedSceneImageId: string | null;
  sceneImages: StudioSceneImageListItem[];
  createdAt: string;
  updatedAt: string;
};

export type StudioSceneImageListResponse = {
  images: StudioSceneImageListItem[];
};

export type StudioSceneImageDetailResponse = {
  image: StudioSceneImageListItem;
};

export type StudioBulkSceneImageResponse = {
  results: Array<{
    sceneId: string;
    ok: boolean;
    imageId?: string;
    error?: string;
  }>;
};

export type StudioStoryboardListItem = {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  promptStyleProfile: StudioPromptStyleProfile;
  directorProfile: StudioDirectorProfile;
  aiDirectorPrompt: string;
  aiDirectorStyleStrength: string;
  voiceEnabled: boolean;
  voiceLanguage: string;
  voiceStyle: string;
  voiceProfile: string;
  narrationMode: string;
  voiceNarrationScript: string;
  musicEnabled: boolean;
  musicStyle: string;
  musicIntensity: string;
  musicNarrativeRole: string;
  musicNotes: string;
  soundEnabled: boolean;
  soundStyle: string;
  soundDensity: string;
  soundNotes: string;
  audioProductionEnabled: boolean;
  audioStyle: string;
  audioPriorityStrategy: string;
  audioNotes: string;
  audioAssetsEnabled: boolean;
  audioAssetNotes: string;
  audioAssetLinks: StoryboardAudioAssetLinks;
  autoSelectImprovedImage: boolean;
  sceneCount: number;
  createdAt: string;
  updatedAt: string;
  ownerEmail?: string;
};

export type StudioStoryboardDetail = StudioStoryboardListItem & {
  scenes: StudioSceneDetail[];
};

export type StudioStoryboardListResponse = {
  storyboards: StudioStoryboardListItem[];
};

export type StudioStoryboardDetailResponse = {
  storyboard: StudioStoryboardDetail;
};

export type StudioMotionProjectSummary = {
  id: string;
  title: string | null;
  status: string;
  projectType: string;
  updatedAt: string;
  latestExportStatus: string | null;
  hasCompletedFinal: boolean;
};

export type StudioMotionProjectsResponse = {
  projects: StudioMotionProjectSummary[];
};

export type StudioSceneDetailResponse = {
  scene: StudioSceneDetail;
};
