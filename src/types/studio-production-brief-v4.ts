import type { StudioProductionBriefSelections } from "@/types/studio-production-brief-v3";

export type BriefEmotionId =
  | "joy"
  | "trust"
  | "excitement"
  | "calm"
  | "urgency"
  | "nostalgia";

export type BriefVisualStyleId =
  | "cinematic"
  | "pixar"
  | "anime"
  | "manga"
  | "cartoon"
  | "realistic"
  | "fantasy";

export type StudioProductionBriefV4Selections = StudioProductionBriefSelections & {
  emotions: BriefEmotionId[];
  visualStyles: BriefVisualStyleId[];
  aiEverythingMode: boolean;
};

export const DEFAULT_BRIEF_V4_SELECTIONS: StudioProductionBriefV4Selections = {
  goals: ["promote"],
  tones: ["energetic"],
  narrative: ["both"],
  pace: ["normal"],
  length: ["medium"],
  audience: ["general"],
  emotions: ["excitement"],
  visualStyles: ["cinematic"],
  aiEverythingMode: false,
};
