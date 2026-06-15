/** Library Consistency V1 — unified index for completed generations. */

export const LIBRARY_CONSISTENCY_CATEGORIES = [
  "characters",
  "mascots",
  "locations",
  "props",
  "worlds",
  "logos",
  "images",
  "audio",
  "music",
  "sfx",
  "voices",
  "video",
  "exports",
] as const;

export type LibraryConsistencyCategory = (typeof LIBRARY_CONSISTENCY_CATEGORIES)[number];

export const LIBRARY_SOURCE_MODULES = [
  "studio",
  "editor",
  "motion",
  "publish",
  "wizard",
  "extraction",
] as const;

export type LibrarySourceModule = (typeof LIBRARY_SOURCE_MODULES)[number];

export const LIBRARY_GENERATION_TYPES = [
  "character",
  "character_extraction",
  "mascot",
  "location",
  "prop",
  "world",
  "logo",
  "editor_variant",
  "editor_output",
  "motion_output",
  "publish_export",
  "music",
  "sfx",
  "voice",
  "image",
] as const;

export type LibraryGenerationType = (typeof LIBRARY_GENERATION_TYPES)[number];

export type LibraryConsistencyBackingStore =
  | "prisma_character"
  | "prisma_prop"
  | "prisma_location"
  | "prisma_world"
  | "generated_reference"
  | "user_upload"
  | "audio_library"
  | "voice_clone";

export type LibraryFusionMetadata = {
  fusionIntent?: string | null;
  fusionArchetype?: string | null;
  sourceAssets?: Array<{ role: string; roleId?: string; url: string; name: string }>;
  questionAnswers?: Record<string, unknown>;
  outputSettings?: Record<string, unknown>;
  generationProfile?: string | null;
};

export type LibraryMotionMetadata = {
  storyboardId?: string | null;
  durationSec?: number | null;
  previewUrl?: string | null;
  finalVideoUrl?: string | null;
  renderVersion?: string | null;
  exportId?: string | null;
};

export type LibraryPublishMetadata = {
  publishProfile?: string | null;
  format?: string | null;
  durationSec?: number | null;
  exportUrl?: string | null;
};

export type LibraryConsistencyRecord = {
  id: string;
  ownerId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  generationType: LibraryGenerationType;
  category: LibraryConsistencyCategory;
  registryAssetId: string;
  backingStore: LibraryConsistencyBackingStore;
  backingId: string;
  assetUrl: string;
  storageKey: string;
  thumbnailUrl: string | null;
  assetName: string;
  promptSummary: string | null;
  projectId: string | null;
  projectTitle: string | null;
  sourceModule: LibrarySourceModule;
  /** Character cluster route when saved via wizard */
  sourceRoute: string | null;
  /** Unified asset type label for filters */
  assetType: string;
  /** Workflow identifier: character_new | fusion | motion_render | publish_export | … */
  workflow: string | null;
  storyboardId?: string | null;
  /** Character engine metadata for Motion/Studio filtering */
  characterCompleteness?: string | null;
  motionReadinessScore?: number | null;
  motionReady?: boolean | null;
  missingParts?: string[] | null;
  characterType?: string | null;
  /** Fusion archetype filters */
  fusionIntent?: string | null;
  fusionArchetype?: string | null;
  fusionMetadata?: LibraryFusionMetadata | null;
  motionMetadata?: LibraryMotionMetadata | null;
  publishMetadata?: LibraryPublishMetadata | null;
  usedInModules?: LibrarySourceModule[];
  status: "completed";
};

export type LibraryConsistencyManifest = {
  version: 1;
  ownerId: string;
  updatedAt: string;
  records: LibraryConsistencyRecord[];
};

export type LibraryConsistencyAuditEntry = {
  endpoint: string;
  generationType: LibraryGenerationType;
  wired: boolean;
  notes?: string;
};

export type LibraryConsistencyMissingAsset = {
  storageKey: string;
  assetUrl: string;
  generationType: LibraryGenerationType;
  category: LibraryConsistencyCategory;
  projectId: string | null;
  projectTitle: string | null;
  createdAt: string;
  thumbnailUrl: string | null;
  assetName: string;
};

export type RegisterCompletedGenerationInput = {
  ownerId: string;
  createdBy: string;
  generationType: LibraryGenerationType;
  assetUrl: string;
  storageKey: string;
  thumbnailUrl?: string | null;
  assetName?: string;
  promptSummary?: string | null;
  projectId?: string | null;
  projectTitle?: string | null;
  sourceModule: LibrarySourceModule;
  backingStore: LibraryConsistencyBackingStore;
  backingId: string;
  registryAssetId: string;
  /** Character cluster canonical route: new | from-reference | motion-ready */
  sourceRoute?: string | null;
  characterCompleteness?: string | null;
  motionReadinessScore?: number | null;
  motionReady?: boolean | null;
  missingParts?: string[] | null;
  characterType?: string | null;
  assetType?: string | null;
  workflow?: string | null;
  storyboardId?: string | null;
  fusionIntent?: string | null;
  fusionArchetype?: string | null;
  fusionMetadata?: LibraryFusionMetadata | null;
  motionMetadata?: LibraryMotionMetadata | null;
  publishMetadata?: LibraryPublishMetadata | null;
  usedInModules?: LibrarySourceModule[];
};
