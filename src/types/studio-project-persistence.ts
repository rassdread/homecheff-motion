import type { MotionStudioIntelligenceSnapshot } from "@/types/motion-studio-intelligence";
import type { MotionRenderReadiness } from "@/types/motion-studio-intelligence";

export type StudioIntelligenceStatus = "current" | "stale" | "missing";

export type StudioImageLineageEntry = {
  order: number;
  sceneId: string;
  studioSceneImageId: string | null;
  previewUrl: string | null;
};

/** Intelligence persisted on AnimationProject (includes lineage for stale detection). */
export type StoredStudioIntelligence = MotionStudioIntelligenceSnapshot & {
  imageLineage: StudioImageLineageEntry[];
  imageLineageFingerprint: string;
};

export type StudioProjectImportInput = {
  storyboardId: string;
  storyboardTitle: string;
  handoffVersion: number;
  importedAt?: string;
  intelligence: MotionStudioIntelligenceSnapshot;
  /** Optional raw handoff — server sanitizes before storage. */
  handoff?: unknown;
  imageLineage?: StudioImageLineageEntry[];
};

export type ProjectStudioSourceSummary = {
  storyboardId: string;
  storyboardTitle: string;
  handoffVersion: number;
  importedAt: string;
};

/** API-facing Studio QA block (project detail, progress, export metadata). */
export type ProjectStudioQaResponse = {
  status: StudioIntelligenceStatus;
  source: ProjectStudioSourceSummary;
  intelligence: MotionStudioIntelligenceSnapshot;
  readiness: MotionRenderReadiness;
  /** Shown when wizard draft may still have data but DB row predates V19. */
  draftOnlyWarning?: boolean;
};

export type ProjectStudioExportMetadata = {
  studioSource: ProjectStudioSourceSummary | null;
  studioIntelligence: MotionStudioIntelligenceSnapshot | null;
  studioReadiness: MotionRenderReadiness | null;
  studioIntelligenceStatus: StudioIntelligenceStatus;
};

export type StudioRenderAuditMetadata = {
  sourceStoryboardId: string | null;
  handoffVersion: number | null;
  studioIntelligenceStatus: StudioIntelligenceStatus;
  selectedSceneImageIds: string[];
  averageCharacterIdentityScore: number | null;
  averageVisionScore: number | null;
  averageConsistencyScore: number | null;
};
