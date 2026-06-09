import type { AssetLifecycleManifestFields } from "@/types/studio-asset-lifecycle";

/** Studio V40 — unified media asset registry. */

export const STUDIO_ASSET_CATEGORIES = [
  "character",
  "location",
  "prop",
  "voice",
  "music",
  "ambience",
  "sound_effect",
  "mouth_asset",
  "reference_image",
  "brand_asset",
] as const;

export type StudioAssetCategory = (typeof STUDIO_ASSET_CATEGORIES)[number];

export type StudioAssetSource = "system" | "user" | "imported";

export type StudioAssetOrigin = "generated" | "uploaded" | "derived" | "manual" | "system";

export type StudioAssetVisibility =
  | "user_owned"
  | "system_usable"
  | "system_hidden"
  | "admin_only"
  | "placeholder";

export type StudioAssetStatus = "active" | "draft" | "archived";

export type StudioReferenceAcceptance = "draft" | "accepted" | "rejected";

export type StudioAssetSourceRef = {
  entityType: "character" | "location" | "prop" | "world" | "scene_image" | "audio_catalog" | "voice_preset" | "brand_catalog";
  entityId: string;
};

export type StudioAsset = {
  id: string;
  name: string;
  category: StudioAssetCategory;
  description: string;
  tags: string[];
  owner: string;
  source: StudioAssetSource;
  status: StudioAssetStatus;
  createdAt: string;
  updatedAt: string;
  sourceRef: StudioAssetSourceRef;
  previewUrl?: string | null;
  collectionIds: string[];
  /** Downloadable image URL when preview exists */
  downloadUrl?: string | null;
  storageKey?: string | null;
  origin?: StudioAssetOrigin;
  visibility?: StudioAssetVisibility;
  isFavorite?: boolean;
  lastUsedAt?: string | null;
  generationId?: string;
  promptSummary?: string;
  /** Wizard blob reference acceptance state (generated tab). */
  referenceAcceptance?: StudioReferenceAcceptance;
  /** Semantic identity continuity snapshot from persisted asset record. */
  semanticContinuity?: StudioAssetSemanticContinuity;
  /** Blob manifest or entity lifecycle state (hide/archive/delete). */
  lifecycle?: AssetLifecycleManifestFields;
};

export type StudioAssetSemanticContinuity = {
  brandIdentity?: string;
  assetFamily?: string;
  fingerprintHash?: string;
  identityScore?: number;
  familyScore?: number;
  brandScore?: number;
  shapeMarkerScore?: number;
  derivedFromSourceName?: string;
  derivedFromAssetId?: string;
  visionSummary?: string;
  identityAssetType?: string;
  identityProfile?: string;
  animationReadinessScore?: number;
  characterConstructionSummary?: string;
  postureSummary?: string;
  bodySummary?: string;
  identityImportance?: string;
  referencePlacements?: import("@/types/studio-asset-generation-workbench").AssetReferencePlacement[];
  characterStyleCard?: string;
};

export type StudioAssetCollection = {
  id: string;
  name: string;
  description: string;
  labelKey: string;
  brandKey?: string;
  assetIds: string[];
};

export type StudioAssetLink = {
  assetId: string;
  role: string;
  label?: string;
};

export type CharacterAssetBundle = {
  characterId: string;
  characterName: string;
  referenceImages: StudioAssetLink[];
  mouthAssets: StudioAssetLink[];
  voiceAssets: StudioAssetLink[];
};

export type LocationAssetBundle = {
  locationId: string;
  locationName: string;
  referenceImages: StudioAssetLink[];
  ambienceAssets: StudioAssetLink[];
  musicRecommendations: StudioAssetLink[];
  worldProfileId: string | null;
};

export type StudioAssetUsageRef = {
  entityType: "character" | "storyboard" | "scene" | "motion_project" | "location" | "prop";
  entityId: string;
  entityName: string;
  sceneOrder?: number;
};

export type StudioAssetUsageEntry = {
  assetId: string;
  assetName: string;
  category: StudioAssetCategory;
  usedBy: StudioAssetUsageRef[];
};

export type MediaAssetWarning = {
  code: string;
  severity: "info" | "warning";
  messageKey: string;
  params?: Record<string, string | number>;
  assetId?: string;
};

export type MediaAssetPlan = {
  enabled: boolean;
  registrySummary: string;
  assets: StudioAsset[];
  collections: StudioAssetCollection[];
  characterBundles: CharacterAssetBundle[];
  locationBundles: LocationAssetBundle[];
  usage: StudioAssetUsageEntry[];
  warnings: MediaAssetWarning[];
  validationScore: number;
};

/** Motion handoff V20 — media asset metadata. */
export type MotionMediaAssetHandoffPlan = {
  enabled: boolean;
  registrySummary: string;
  assetReferences: Array<{
    id: string;
    name: string;
    category: StudioAssetCategory;
    source: StudioAssetSource;
    collectionIds: string[];
  }>;
  assetCollections: StudioAssetCollection[];
  assetUsageSummary: string;
  characterBundles: CharacterAssetBundle[];
  warnings: MediaAssetWarning[];
};
