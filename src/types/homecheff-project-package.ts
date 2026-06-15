import type { EditorGenerationPackage } from "@/types/editor-generation-package";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";
import type { PublishProject } from "@/types/publish-overlay";
import type {
  LibraryFusionMetadata,
  LibraryMotionMetadata,
  LibraryPublishMetadata,
  LibrarySourceModule,
} from "@/types/library-consistency";

export const HOMECHEFF_PACKAGE_VERSION = 1 as const;
export const HOMECHEFF_PACKAGE_EXTENSION = ".hc" as const;

export type HomeCheffPackageVersion = typeof HOMECHEFF_PACKAGE_VERSION;

/** `hc` = HomeCheff project container; `legacy` = pre-HC service-native project. */
export type HomeCheffProjectFormat = "legacy" | "hc";

/** HC package version number, or `"legacy"` for unmigrated projects. */
export type HomeCheffProjectVersion = HomeCheffPackageVersion | "legacy" | number;

export type HomeCheffLegacySource = {
  service: HomeCheffProjectType;
  projectId: string;
  convertedAt?: string;
};

export type HomeCheffConversionHistoryEntry = {
  id: string;
  from: HomeCheffLegacySource;
  toHcProjectId: string;
  status: "success" | "failed";
  error?: string;
  createdAt: string;
};

export type HomeCheffProjectListFilter = "active" | "hc" | "legacy" | "archived";

export type HomeCheffProjectType =
  | "editor"
  | "motion"
  | "publish"
  | "studio"
  | "library"
  | "export";

export type HomeCheffShareMode =
  | "private_backup"
  | "view_only"
  | "editable_copy"
  | "download_allowed"
  | "commercial_use";

export type HomeCheffProjectPermission = {
  view: boolean;
  edit: boolean;
  copy: boolean;
  downloadAssets: boolean;
  commercialUse: boolean;
  share: boolean;
  shareMode?: HomeCheffShareMode;
  expiresAt?: string;
  allowedUserIds?: string[];
  allowedTeamIds?: string[];
};

export type HomeCheffAssetLibraryMetadata = {
  assetType?: string;
  workflow?: string | null;
  characterType?: string | null;
  characterCompleteness?: string | null;
  motionReady?: boolean | null;
  motionReadinessScore?: number | null;
  missingParts?: string[] | null;
  fusionIntent?: string | null;
  fusionArchetype?: string | null;
  fusionMetadata?: LibraryFusionMetadata | null;
  motionMetadata?: LibraryMotionMetadata | null;
  publishMetadata?: LibraryPublishMetadata | null;
  sourceRoute?: string | null;
  sourceModule?: LibrarySourceModule;
};

export type HomeCheffAssetReference = {
  id: string;
  url: string;
  storageKey?: string;
  mimeType?: string;
  kind: string;
  role?: string;
  sourceService: HomeCheffProjectType;
  createdAt: string;
  checksum?: string;
  accessScope: "project" | "owner";
  libraryMetadata?: HomeCheffAssetLibraryMetadata;
};

export type HomeCheffProjectHandoff = {
  id: string;
  sourceService: HomeCheffProjectType;
  targetService: HomeCheffProjectType;
  handoffType: string;
  payload?: Record<string, unknown>;
  createdAt: string;
};

export type HomeCheffEditorState = {
  sessionId?: string;
  editorProjectId?: string;
  workflow?: string;
  generationPackageIds?: string[];
  generationPackages?: EditorGenerationPackage[];
  documentSnapshot?: Partial<EditorCanvasDocument>;
  prompts?: Record<string, string>;
  settings?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

export type HomeCheffMotionState = {
  motionProjectId?: string;
  sourceImageUrls?: string[];
  sequenceFrameUrls?: string[];
  durationSec?: number;
  transitionStyle?: string;
  motionPrompt?: string;
  generatedVideoUrl?: string;
  thumbnailUrl?: string;
  prompts?: Record<string, string>;
  settings?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

export type HomeCheffPublishState = {
  publishProjectId?: string;
  publishIntent?: string;
  mediaKind?: PublishProject["mediaKind"];
  imageUrls?: string[];
  videoUrl?: string;
  publishPrompt?: string;
  projectSnapshot?: Partial<PublishProject>;
  prompts?: Record<string, string>;
  settings?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

export type HomeCheffStudioState = {
  storyboardId?: string;
  sceneId?: string;
  sceneTitle?: string;
  sceneDescription?: string;
  sceneImageUrl?: string;
  suggestedStoryboardRole?: string;
  prompts?: Record<string, string>;
  settings?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

export type HomeCheffLibraryState = {
  savedAssetIds?: string[];
  workflowOrigin?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
};

export type HomeCheffServicePayload = {
  editor?: HomeCheffEditorState;
  motion?: HomeCheffMotionState;
  publish?: HomeCheffPublishState;
  studio?: HomeCheffStudioState;
  library?: HomeCheffLibraryState;
};

export type HomeCheffProjectPackage = {
  id: string;
  version: HomeCheffPackageVersion;
  projectFormat?: HomeCheffProjectFormat;
  projectVersion?: HomeCheffProjectVersion;
  projectType: HomeCheffProjectType;
  createdAt: string;
  updatedAt: string;
  ownerId?: string;
  sourceService?: HomeCheffProjectType;
  targetService?: HomeCheffProjectType;
  title: string;
  description?: string;
  permissions: HomeCheffProjectPermission;
  assetReferences: HomeCheffAssetReference[];
  generationPackageIds: string[];
  workflowState: Record<string, unknown>;
  metadata: Record<string, unknown>;
  prompts: Record<string, string>;
  settings: Record<string, unknown>;
  handoffHistory: HomeCheffProjectHandoff[];
  servicePayload: HomeCheffServicePayload;
  legacySource?: HomeCheffLegacySource;
  conversionHistory?: HomeCheffConversionHistoryEntry[];
  isArchived?: boolean;
  archivedAt?: string;
};

export type HomeCheffProjectOpenTarget = {
  service: HomeCheffProjectType;
  available: boolean;
  labelKey: string;
};
