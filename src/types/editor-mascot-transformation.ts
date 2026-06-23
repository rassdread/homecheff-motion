import type { EditorFusionIntent } from "@/types/editor-instruction-studio";

export const MASCOT_TRANSFORM_TARGET_TYPES = [
  "human_version",
  "new_mascot",
  "chef_mascot",
  "garden_mascot",
  "designer_mascot",
  "character_3d",
  "cinematic",
  "cartoon_sticker",
  "business_avatar",
  "custom",
] as const;

export type MascotTransformTargetType = (typeof MASCOT_TRANSFORM_TARGET_TYPES)[number];

export const MASCOT_TRANSFORM_PRESERVE_OPTIONS = [
  "colors",
  "face_shape",
  "eyes",
  "clothing",
  "accessories",
  "logo",
  "pose",
  "style",
] as const;

export type MascotTransformPreserveOption = (typeof MASCOT_TRANSFORM_PRESERVE_OPTIONS)[number];

export type MascotTransformSourceType = "mascot" | "human" | "unknown";

export type TransformationBlueprint = {
  sourceType: MascotTransformSourceType;
  targetType: MascotTransformTargetType;
  preserve: MascotTransformPreserveOption[];
  change: string[];
  style?: string;
  userIntent: string;
  renderInstructions: string[];
  fusionIntent: EditorFusionIntent;
};

export type MascotTransformAdvancedOptions = {
  styleStrength?: number;
  identityStrength?: number;
  preserveColors?: boolean;
  preserveLogo?: boolean;
  outputStyle?: string;
  customPrompt?: string;
  seed?: number | null;
};
