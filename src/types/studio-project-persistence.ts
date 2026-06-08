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
  refreshedAt?: string;
};

/** API-facing Studio QA block (project detail, progress, export metadata). */
export type ProjectStudioQaResponse = {
  status: StudioIntelligenceStatus;
  source: ProjectStudioSourceSummary;
  intelligence: MotionStudioIntelligenceSnapshot;
  readiness: MotionRenderReadiness;
  /** Shown when wizard draft may still have data but DB row predates V19. */
  draftOnlyWarning?: boolean;
  /** Set when client requested a storyboard stale check. */
  storyboardStale?: StudioIntelligenceStalenessResult;
  /** True when status is stale, lastStaleReason set, or storyboardStale.isStale. */
  storyboardOutdated?: boolean;
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
  suggestStudioRefresh?: boolean;
  /** V26: compact semantic recipe lineage for debugging renders. */
  semanticRecipeVersion?: number | null;
  promptLineageHashes?: string[];
  assetSemanticRecordIds?: string[];
};

export type StudioStalenessSeverity = "low" | "medium" | "high";

export type StudioStalenessReason = {
  code: string;
  message: string;
  severity: StudioStalenessSeverity;
  sceneId?: string;
};

export type StudioIntelligenceStalenessResult = {
  isStale: boolean;
  severity: StudioStalenessSeverity | null;
  reasons: StudioStalenessReason[];
  /** Lightweight fingerprint of stored handoff (if any). */
  storedFingerprint: string | null;
  latestFingerprint: string | null;
};

export type StudioScoreChange = {
  sceneId: string;
  field: "vision" | "consistency" | "characterIdentity";
  before: number | null;
  after: number | null;
};

export type StudioSelectedImageChange = {
  sceneId: string;
  sceneTitle: string;
  beforeImageId: string | null;
  afterImageId: string | null;
};

export type StudioRefreshAuditEntry = {
  type?: "studio_refresh";
  refreshedAt: string;
  refreshedBy: string;
  previousHandoffVersion: number | null;
  newHandoffVersion: number;
  staleReasons: string[];
  scoreChanges: StudioScoreChange[];
  selectedImageChanges: StudioSelectedImageChange[];
};

export type StudioRefreshAuditJson = {
  events: Array<StudioRefreshAuditEntry | import("@/types/studio-motion-sync").StudioSyncAuditEntry>;
  lastRefresh?: StudioRefreshAuditEntry;
  lastSync?: import("@/types/studio-motion-sync").StudioSyncAuditEntry;
};

export type RefreshStudioIntelligenceOptions = {
  refreshQa?: boolean;
  refreshImages?: boolean;
  refreshText?: boolean;
};

export type RefreshStudioIntelligenceResult =
  | {
      ok: true;
      projectId: string;
      studioQa: ProjectStudioQaResponse;
      audit: StudioRefreshAuditEntry;
      stalenessBefore: StudioIntelligenceStalenessResult;
    }
  | { ok: false; code: string; error: string; status: number };
