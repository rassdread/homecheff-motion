/** Visible character creation pipeline — 4-step UX with job tracking. */

export const CHARACTER_PIPELINE_STEP_IDS = [
  "detach_character",
  "remove_background",
  "process_clothing_props",
  "save_to_library",
] as const;

export type CharacterPipelineStepId = (typeof CHARACTER_PIPELINE_STEP_IDS)[number];

export type CharacterPipelineBadgeStatus = "queued" | "running" | "completed" | "failed";

export type CharacterPipelineJob = {
  id: string;
  name: string;
  status: CharacterPipelineBadgeStatus;
  activeStepId: CharacterPipelineStepId;
  previewUrl?: string;
  characterId?: string;
  storyboardId?: string;
  attachedToProject?: boolean;
  error?: string;
  createdAt: string;
  completedAt?: string;
};

export type CharacterPipelineResult = {
  characterId: string;
  name: string;
  imageUrl: string;
  attachedToProject: boolean;
  storyboardId?: string;
};
