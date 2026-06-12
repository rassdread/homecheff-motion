/** User-directed production brief selections (Studio V3). */

export type BriefGoalId =
  | "sell"
  | "explain"
  | "promote"
  | "story"
  | "social"
  | "education";

export type BriefToneId =
  | "emotional"
  | "inspiring"
  | "funny"
  | "serious"
  | "energetic"
  | "luxury";

export type BriefNarrativeId = "narrator" | "characters" | "both";

export type BriefPaceId = "slow" | "normal" | "fast";

export type BriefLengthId = "short" | "medium" | "long";

export type BriefAudienceId =
  | "consumers"
  | "business"
  | "youth"
  | "seniors"
  | "general";

export type StudioProductionBriefSelections = {
  goals: BriefGoalId[];
  tones: BriefToneId[];
  narrative: BriefNarrativeId[];
  pace: BriefPaceId[];
  length: BriefLengthId[];
  audience: BriefAudienceId[];
};

export const DEFAULT_BRIEF_SELECTIONS: StudioProductionBriefSelections = {
  goals: ["promote"],
  tones: ["energetic"],
  narrative: ["both"],
  pace: ["normal"],
  length: ["medium"],
  audience: ["general"],
};

export type StudioStoryPlanScene = {
  id: string;
  index: number;
  title: string;
  purpose: string;
  description: string;
  dialogue: string;
  voiceOver: string;
  location: string;
  requiredAssets: string[];
  durationSeconds: number;
};

export type StudioStoryPlan = {
  logline: string;
  storyStructure: string;
  scenes: StudioStoryPlanScene[];
  characterNotes: string[];
  voiceOverProposal: string;
  locationNotes: string[];
  assetRequirements: string[];
  builtAt: string;
};

export type StudioProductionRoute = "prompt_only" | "asset_first" | "mixed";

export type StudioCharacterWizardAnswers = {
  type: "human" | "mascot" | "animal" | "fantasy" | "product";
  presentation: "male" | "female" | "neutral" | "brand";
  ageEnergy: "child" | "young" | "adult" | "older" | "timeless";
  style: "realistic" | "cinematic" | "cartoon" | "anime" | "pixar-like";
  coreTrait: "friendly" | "professional" | "funny" | "strong" | "smart";
};
