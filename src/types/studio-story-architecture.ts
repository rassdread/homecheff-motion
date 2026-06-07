/**
 * Studio V2 — Story Architect (narrative layer before scenes; no new AI).
 */

import type { StoryArcPhase } from "@/lib/studio-story-arc";
import type {
  ProductionStoryStructurePhase,
  StoryStructurePhaseId,
  StoryStructurePhaseStatus,
} from "@/types/studio-production-plan";
import type { StudioProductionBrief } from "@/types/studio-production-brief";

export type StoryNarrativeMomentId =
  | "departure"
  | "discovery"
  | "conflict"
  | "breakthrough"
  | "closing";

export type StoryNarrativeMoment = {
  id: StoryNarrativeMomentId;
  labelKey: string;
  beatKey: string;
  order: number;
  structurePhase: StoryStructurePhaseId;
  arcPhases: StoryArcPhase[];
  sceneOrders: number[];
  status: StoryStructurePhaseStatus;
  beatParams: Record<string, string>;
};

export type StoryArchitecture = {
  version: 1;
  storyGoal: string;
  theme: string;
  message: string;
  storyStructure: ProductionStoryStructurePhase[];
  storyMoments: StoryNarrativeMoment[];
  narrativeFlow: string[];
  directorContextLines: string[];
  recommendationKeys: string[];
};

export type BuildStoryArchitectureInput = {
  userIdea: string;
  productionBrief?: StudioProductionBrief | null;
  storyboard?: import("@/types/studio-api").StudioStoryboardDetail;
  characters?: import("@/types/studio-api").StudioCharacterListItem[];
  locations?: import("@/types/studio-api").StudioLocationListItem[];
  props?: import("@/types/studio-api").StudioPropListItem[];
  worlds?: import("@/types/studio-api").StudioWorldProfileListItem[];
  projectMemory?: import("@/types/studio-project-memory").StudioProjectMemorySnapshot;
  assetDecisionRegistry?: import("@/types/studio-asset-decision").StudioAssetDecisionRegistry;
  directorProfile?: string;
  styleProfile?: string;
  plannedSceneCount?: number;
};

export type StoryArchitectureContext = {
  architecture: StoryArchitecture;
  contextLines: string[];
  recommendationKeys: string[];
};

export type StoryArchitectSummary = {
  storyGoal: string;
  theme: string;
  message: string;
  momentCount: number;
  structureComplete: boolean;
  labelKey: string;
  params: Record<string, string>;
};
