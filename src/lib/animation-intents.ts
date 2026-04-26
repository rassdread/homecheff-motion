import type { AnimationPresetId } from "@/lib/animation-presets";

export const ANIMATION_INTENTS = {
  morph: {
    label: "Morph",
    prompt:
      "The same subject transforms smoothly into the next image, preserving structure and identity.",
  },
  cinematic: {
    label: "Cinematic",
    prompt:
      "Scene evolves with cinematic camera movement, soft zoom, and natural motion.",
  },
  product: {
    label: "Product",
    prompt:
      "Product remains central and transforms cleanly into the next scene with controlled motion.",
  },
  dynamic: {
    label: "Dynamic",
    prompt: "Energetic transformation with dynamic motion, faster evolution between scenes.",
  },
} as const;

export type AnimationIntentId = keyof typeof ANIMATION_INTENTS;

export const ANIMATION_INTENT_IDS = Object.keys(ANIMATION_INTENTS) as AnimationIntentId[];

export function validateAnimationIntentId(value: unknown): value is AnimationIntentId {
  return (
    typeof value === "string" &&
    (value === "morph" ||
      value === "cinematic" ||
      value === "product" ||
      value === "dynamic")
  );
}

/** smooth → morph; other presets → cinematic */
export function defaultIntentForPreset(presetId: AnimationPresetId): AnimationIntentId {
  return presetId === "smooth" ? "morph" : "cinematic";
}

export function normalizeAnimationIntent(raw: unknown): AnimationIntentId {
  if (raw === undefined || raw === null) {
    return "cinematic";
  }
  const s = String(raw).trim().toLowerCase();
  if (validateAnimationIntentId(s)) {
    return s;
  }
  return "cinematic";
}
