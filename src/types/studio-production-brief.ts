/**
 * Studio V2 — Production Brief (project-level planning before storyboard).
 */

import type { AiDirectorStyleStrength } from "@/lib/studio-ai-director-interpreter";
import type { StudioDirectorProfile } from "@/lib/studio-director-profiles";
import type { StudioPromptStyleProfile } from "@/lib/studio-prompt-style-profiles";
import type { StudioProductionPlan } from "@/types/studio-production-plan";
import type { StudioAssetDecision } from "@/types/studio-asset-decision";

export type ProductionBriefActionIntensity = "low" | "medium" | "high";

export type ProductionBriefContentType =
  | "commercial"
  | "social_media"
  | "storytelling"
  | "documentary"
  | "educational"
  | "cinematic";

export type ProductionBriefAssetKind = "character" | "location" | "prop";

export type ProductionBriefAssetProposal = {
  id: string;
  name: string;
  kind: ProductionBriefAssetKind;
  status: "existing" | "new" | "recommended";
  existingId?: string;
  reasonKey: string;
  reasonParams?: Record<string, string>;
  recurringMatch?: boolean;
};

export type ProductionBriefRecommendation = {
  id: string;
  messageKey: string;
  messageParams?: Record<string, string>;
  priority: "high" | "medium" | "low";
};

export type ProductionBriefStoryPreview = {
  estimatedSceneCount: number;
  estimatedShotCount: number;
  estimatedDurationSeconds: number;
  mainCharacterCount: number;
  locationCount: number;
};

export type ProductionBriefTargetStyle = {
  directorProfile: StudioDirectorProfile;
  promptStyleProfile: StudioPromptStyleProfile;
  moodKeywords: string[];
  styleStrength: AiDirectorStyleStrength;
  contentType: ProductionBriefContentType;
  contentTypeLabelKey: string;
};

export type ProductionBriefWorld = {
  name: string;
  existingId?: string;
  reasonKey?: string;
};

export type StudioProductionBrief = {
  version: 1;
  idea: string;
  goal: string;
  estimatedDurationSeconds: number;
  contentType: ProductionBriefContentType;
  contentTypeLabelKey: string;
  world: ProductionBriefWorld | null;
  mainCharacters: ProductionBriefAssetProposal[];
  recommendedLocations: ProductionBriefAssetProposal[];
  recommendedProps: ProductionBriefAssetProposal[];
  actionIntensity: ProductionBriefActionIntensity;
  targetStyle: ProductionBriefTargetStyle;
  callToAction: string;
  callToActionKey: string;
  recommendations: ProductionBriefRecommendation[];
  storyPreview: ProductionBriefStoryPreview;
  productionPlan?: StudioProductionPlan;
  assetDecisions?: StudioAssetDecision[];
};

export type StudioProductionBriefInput = {
  idea: string;
  characters?: import("@/types/studio-api").StudioCharacterListItem[];
  locations?: import("@/types/studio-api").StudioLocationListItem[];
  props?: import("@/types/studio-api").StudioPropListItem[];
  worlds?: import("@/types/studio-api").StudioWorldProfileListItem[];
  projectMemory?: import("@/types/studio-project-memory").StudioProjectMemorySnapshot;
  styleStrength?: AiDirectorStyleStrength;
};
