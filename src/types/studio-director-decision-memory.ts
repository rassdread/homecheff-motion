/**
 * Studio V2 — Director apply learning & decision memory (advisory only).
 */

import type { StudioStoryboardDetail } from "@/types/studio-api";
import type { DirectorProposalApplyMode } from "@/types/studio-director-proposal";

export type DirectorDecisionChangeKind =
  | "scene_added"
  | "scene_removed"
  | "scene_rewritten"
  | "character_removed"
  | "location_changed"
  | "voice_changed"
  | "render_strategy_changed";

export type DirectorApplyAuditKind =
  | "director_applied"
  | "director_partially_applied"
  | "director_modified"
  | "director_rejected";

export type DirectorDecisionChange = {
  kind: DirectorDecisionChangeKind;
  detailKey: string;
  detailParams?: Record<string, string>;
};

export type DirectorApplyAuditRecord = {
  id: string;
  storyboardId: string;
  at: string;
  kind: DirectorApplyAuditKind;
  applyMode?: DirectorProposalApplyMode;
  proposalSceneCount: number;
  appliedSceneCount?: number;
  retentionScore?: number;
  changes: DirectorDecisionChange[];
  snapshotId?: string;
};

export type DirectorApplyBaseline = {
  appliedAt: string;
  auditId: string;
  proposalSceneCount: number;
  scenes: Array<{
    order: number;
    title: string;
    description: string;
    characterIds: string[];
    locationId: string | null;
  }>;
  voiceProfile: string;
  renderStrategy?: string;
};

export type DirectorDecisionPattern = {
  id: string;
  labelKey: string;
  count: number;
  confidence: "high" | "medium" | "low";
  params?: Record<string, string>;
};

export type DirectorDecisionMemory = {
  version: 1;
  auditCount: number;
  preferredSceneCountMin?: number;
  preferredSceneCountMax?: number;
  oftenAcceptedStructures: DirectorDecisionPattern[];
  oftenRemovedStructures: DirectorDecisionPattern[];
  favoriteEndingKeys: DirectorDecisionPattern[];
  favoriteCtaTypes: DirectorDecisionPattern[];
  directorContextLines: string[];
  recommendationKeys: string[];
  learningSummaryKeys: string[];
  proposalRetentionLabelKey?: string;
  proposalRetentionScore?: number;
};

export type DirectorDecisionMemoryContext = {
  memory: DirectorDecisionMemory;
  contextLines: string[];
  recommendationKeys: string[];
};

export type StudioDirectorDecisionRegistry = {
  version: 1;
  storyboardId: string;
  updatedAt: string;
  audits: DirectorApplyAuditRecord[];
  applyBaseline: DirectorApplyBaseline | null;
  pendingProposalId: string | null;
};

export type BuildDirectorDecisionMemoryInput = {
  storyboardId?: string;
  audits?: DirectorApplyAuditRecord[];
  applyBaseline?: DirectorApplyBaseline | null;
  storyboard?: StudioStoryboardDetail;
  renderStrategy?: string;
};
