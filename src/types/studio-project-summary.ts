/**
 * S2H — Human project library view model (not a persistence model).
 */

export const STUDIO_PROJECT_SUMMARY_VERSION = "s2h.1" as const;

export type StudioProjectSourceType =
  | "storyboard"
  | "motion"
  | "image"
  | "local_quick_video"
  | "legacy";

/** Human-facing type badge — never engine/model names. */
export type StudioProjectHumanType = "video" | "image" | "animation" | "story";

export type StudioProjectHumanStatus =
  | "draft"
  | "in_progress"
  | "ready"
  | "needs_update"
  | "failed"
  | "archived"
  | "generating";

export type StudioProjectRecommendedAction =
  | "continue_story"
  | "continue_visuals"
  | "continue_entities"
  | "continue_sound"
  | "finish"
  | "view_video"
  | "continue_editing"
  | "open_project";

export type StudioProjectOriginKind =
  | "standalone"
  | "preset"
  | "homecheff"
  | "growth"
  | "local_device";

export type StudioProjectSummary = {
  version: typeof STUDIO_PROJECT_SUMMARY_VERSION;
  id: string;
  sourceType: StudioProjectSourceType;
  sourceId: string;
  title: string;
  humanType: StudioProjectHumanType;
  status: StudioProjectHumanStatus;
  thumbnailUrl: string | null;
  latestResultUrl: string | null;
  lastEditedAt: string;
  createdAt: string;
  origin: StudioProjectOriginKind;
  presetName: string | null;
  recommendedStage: "story" | "visuals" | "entities" | "sound" | "finish" | null;
  recommendedAction: StudioProjectRecommendedAction;
  hasFinalOutput: boolean;
  versionCount: number;
  languageCount: number;
  archived: boolean;
  canContinue: boolean;
  continueHref: string;
  canRename: boolean;
  canDuplicate: boolean;
  canArchive: boolean;
  canDownload: boolean;
  canOpenHomecheff: boolean;
  canReturnGrowth: boolean;
  returnUrl: string | null;
  localOnly: boolean;
  /** Soft hint when last render failed but older output remains. */
  secondaryWarningKey: string | null;
};

export type StudioProjectLibraryResponse = {
  projects: StudioProjectSummary[];
  nextCursor: string | null;
  localDraftSupported: false;
  sourceWarnings: string[];
  meta: {
    storyboardRoots: number;
    motionOrphans: number;
    dedupedMotionLinks: number;
    durationMs: number;
  };
};

export const LOCAL_QUICK_VIDEO_LIBRARY_CAPABILITY = "LOCAL_DRAFT_LIBRARY_NOT_SUPPORTED" as const;
