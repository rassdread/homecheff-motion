import type { StudioIntelligenceStalenessResult } from "@/types/studio-project-persistence";

export type StudioMotionSyncScenePreview = {
  order: number;
  sceneId: string;
  /** Studio scene id when known. */
  studioSceneId: string | null;
  currentMotionImageId: string | null;
  currentMotionImageUrl: string | null;
  currentStudioSceneImageId: string | null;
  latestStudioImageUrl: string | null;
  imageChanged: boolean;
  currentTitle: string;
  latestStudioTitle: string;
  titleChanged: boolean;
  currentSubtitle: string;
  latestStudioSubtitle: string;
  subtitleChanged: boolean;
  currentEmotion: string | null;
  latestStudioEmotion: string | null;
  emotionChanged: boolean;
  currentDurationSeconds: number | null;
  latestStudioDurationSeconds: number | null;
  durationChanged: boolean;
  metadataChanged: boolean;
  /** Motion image differs from last stored Studio selection. */
  manualImageEdit: boolean;
  /** Text/emotion differs from stored handoff mapping at import. */
  manualTextEdit: boolean;
};

export type StudioMotionSyncPreview = {
  projectId: string;
  storyboardId: string;
  storyboardTitle: string;
  motionSceneCount: number;
  studioSceneCount: number;
  scenes: StudioMotionSyncScenePreview[];
  hasChanges: boolean;
  hasManualMotionEdits: boolean;
  /** Studio has fewer scenes than Motion — removal requires confirmation. */
  requiresRemoveConfirmation: boolean;
  /** Studio has more scenes than Motion — add requires confirmation. */
  requiresAddConfirmation: boolean;
  suggestedDefaults: {
    syncImages: boolean;
    syncTexts: boolean;
    syncEmotions: boolean;
    syncDurations: boolean;
    syncContext: boolean;
  };
  staleness: StudioIntelligenceStalenessResult | null;
  warnings: string[];
};

export type StudioMotionSyncApplyInput = {
  syncImages?: boolean;
  syncTexts?: boolean;
  syncEmotions?: boolean;
  syncDurations?: boolean;
  syncContext?: boolean;
  confirmRemoveScenes?: boolean;
  confirmAddScenes?: boolean;
};

export type StudioSyncAuditEntry = {
  type: "studio_sync";
  syncedAt: string;
  syncedBy: string;
  syncImages: boolean;
  syncTexts: boolean;
  syncEmotions: boolean;
  syncDurations: boolean;
  syncContext: boolean;
  sceneCountBefore: number;
  sceneCountAfter: number;
  imageChanges: number;
  textChanges: number;
  emotionChanges: number;
  durationChanges: number;
  removedSceneCount: number;
  addedSceneCount: number;
};

export type StudioMotionSyncApplyResult =
  | {
      ok: true;
      projectId: string;
      preview: StudioMotionSyncPreview;
      audit: StudioSyncAuditEntry;
      studioQa: import("@/types/studio-project-persistence").ProjectStudioQaResponse | null;
    }
  | { ok: false; code: string; error: string; status: number };
