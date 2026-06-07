/**
 * Studio V2 — Insights Hub (central explainability, advisory only).
 */

import type { StudioToolId } from "@/lib/studio-tool-id";
import type { StudioCreationAssistantInput } from "@/types/studio-creation-assistant";

export type InsightsProjectPhaseId =
  | "idea"
  | "structure"
  | "assets"
  | "images"
  | "audio"
  | "render"
  | "ready";

export type InsightsPhaseStepStatus = "completed" | "current" | "upcoming";

export type InsightsProjectPhaseStep = {
  id: InsightsProjectPhaseId;
  labelKey: string;
  status: InsightsPhaseStepStatus;
};

export type InsightsHealthStatus = "pass" | "warning" | "missing";

export type InsightsHealthDomainId =
  | "story"
  | "assets"
  | "audio"
  | "render"
  | "continuity";

export type InsightsHealthDomain = {
  id: InsightsHealthDomainId;
  labelKey: string;
  status: InsightsHealthStatus;
  detailKey?: string;
  toolId?: StudioToolId;
};

export type InsightsExplanationSource =
  | "generation_plan"
  | "story_architect"
  | "director_preferences"
  | "creative_review"
  | "production_planner"
  | "production_memory"
  | "readiness"
  | "creation_assistant";

export type InsightsExplanation = {
  id: string;
  messageKey: string;
  messageParams?: Record<string, string>;
  source: InsightsExplanationSource;
  sourceLabelKey: string;
  toolId?: StudioToolId;
};

export type InsightsLearningLine = {
  id: string;
  messageKey: string;
  messageParams?: Record<string, string>;
  source: "production_memory" | "director_preferences";
};

export type InsightsSnapshotSummary = {
  recoveryPoint: {
    snapshotId: string;
    labelKey: string;
    labelParams: Record<string, string>;
    sceneCount: number;
    isStale: boolean;
  } | null;
  lastMajorChangeKey: string | null;
  lastMajorChangeParams?: Record<string, string>;
  lastDirectorApplyKey: string | null;
  lastDirectorApplyParams?: Record<string, string>;
};

export type InsightsTimelineSummary = {
  todayCount: number;
  weekCount: number;
  highlightKey: string | null;
  highlightParams?: Record<string, string>;
};

export type InsightsNextBestAction = {
  messageKey: string;
  messageParams?: Record<string, string>;
  toolId?: StudioToolId;
  sourceLabelKey: string;
};

export type StudioInsightsHubView = {
  version: 1;
  currentPhase: InsightsProjectPhaseId;
  projectPhases: InsightsProjectPhaseStep[];
  healthDomains: InsightsHealthDomain[];
  explanations: InsightsExplanation[];
  learningLines: InsightsLearningLine[];
  snapshotSummary: InsightsSnapshotSummary;
  timelineSummary: InsightsTimelineSummary;
  nextBestAction: InsightsNextBestAction | null;
  insightSummaryContextLines: string[];
};

export type InsightsHubContext = {
  view: StudioInsightsHubView;
  contextLines: string[];
  recommendationKeys: string[];
};

export type StudioInsightsHubInput = StudioCreationAssistantInput;
