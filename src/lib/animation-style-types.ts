export type AnimationStyleId =
  | "cartoon_animation"
  | "product_showcase"
  | "character_animation"
  | "marketplace_story"
  | "clean_motion"
  | "fast_social_animation";

export const DEFAULT_ANIMATION_STYLE_ID: AnimationStyleId = "cartoon_animation";

export const ANIMATION_STYLE_IDS: readonly AnimationStyleId[] = [
  "cartoon_animation",
  "product_showcase",
  "character_animation",
  "marketplace_story",
  "clean_motion",
  "fast_social_animation",
] as const;

export function isAnimationStyleId(value: string): value is AnimationStyleId {
  return (ANIMATION_STYLE_IDS as readonly string[]).includes(value);
}

export function normalizeAnimationStyleId(value: unknown): AnimationStyleId {
  if (typeof value === "string" && isAnimationStyleId(value.trim())) {
    return value.trim() as AnimationStyleId;
  }
  return DEFAULT_ANIMATION_STYLE_ID;
}
