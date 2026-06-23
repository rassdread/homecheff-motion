import type { MotionActionPresetId } from "@/types/motion-action-presets";

/** User-facing Motion Hub categories (wizard-first entry). */
export const MOTION_HUB_CATEGORY_IDS = [
  "photo_animation",
  "sports",
  "performance",
  "events",
  "lifestyle",
  "business",
  "adventure",
  "social",
  "mascots",
] as const;

export type MotionHubCategoryId = (typeof MOTION_HUB_CATEGORY_IDS)[number];

export type MotionHubEntryKind = "photo_intent" | "action_preset";

export type MotionHubPhotoIntentId =
  | "animate_photo"
  | "bring_photo_to_life"
  | "photo_to_video";

export type MotionHubEntry = {
  id: string;
  kind: MotionHubEntryKind;
  categoryId: MotionHubCategoryId;
  titleKey: string;
  descriptionKey: string;
  /** When kind is action_preset */
  presetId?: MotionActionPresetId;
  /** When kind is photo_intent */
  photoIntentId?: MotionHubPhotoIntentId;
  visibleInHub: boolean;
};

export type MotionHubCategoryDefinition = {
  id: MotionHubCategoryId;
  titleKey: string;
  descriptionKey: string;
};
