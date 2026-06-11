/** Image Instruction Studio — analyze → guide → generate variant. */

export const EDITOR_INSTRUCTION_OBJECT_IDS = [
  "character",
  "person",
  "mascot",
  "object",
  "globe",
  "logo",
  "text",
  "background",
  "style",
] as const;

export type EditorInstructionObjectId = (typeof EDITOR_INSTRUCTION_OBJECT_IDS)[number];

export const EDITOR_INSTRUCTION_ACTIONS = [
  "remove",
  "replace",
  "change_color",
  "change_style",
  "change_background",
  "duplicate",
  "detach_asset",
] as const;

export type EditorInstructionAction = (typeof EDITOR_INSTRUCTION_ACTIONS)[number];

export type EditorInstructionSliders = {
  /** 0–100 — keep original illustration/photo style */
  preserveStyle: number;
  /** 0–100 — how strong the requested change should be */
  changeStrength: number;
  /** 0–100 — keep brand colors, logo, mascot identity */
  brandPreservation: number;
  /** 0–100 — allow creative interpretation beyond the brief */
  creativity: number;
};

export const DEFAULT_EDITOR_INSTRUCTION_SLIDERS: EditorInstructionSliders = {
  preserveStyle: 80,
  changeStrength: 55,
  brandPreservation: 85,
  creativity: 35,
};

export type EditorInstructionSelection = {
  objectId: EditorInstructionObjectId;
  objectLabel: string;
  action: EditorInstructionAction;
  replacement?: string;
  customPrompt?: string;
  sliders: EditorInstructionSliders;
  preserveCharacter?: boolean;
};

export type EditorInstructionVariantStatus = "pending" | "running" | "completed" | "failed";

export type EditorInstructionVariant = {
  id: string;
  sourceImageUrl: string;
  sourceImageId: string;
  resultUrl?: string;
  resultStorageKey?: string;
  instruction: EditorInstructionSelection;
  prompt: string;
  provider?: string;
  model?: string;
  costEstimateUsd?: number;
  status: EditorInstructionVariantStatus;
  userNote?: string;
  versionNote?: string;
  createdAt: string;
  updatedAt: string;
  error?: string;
};

export type EditorInstructionStudioState = {
  activeVariantId?: string | null;
  selection?: Partial<EditorInstructionSelection>;
};
