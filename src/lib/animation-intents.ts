import type { TranslationKey } from "@/i18n";
import type { AnimationPresetId } from "@/lib/animation-presets";

type IntentDefinition = {
  /** Vidu prompt fragment — do not change without product review. */
  prompt: string;
  /** User-facing explanation (i18n). */
  descriptionKey: TranslationKey;
  /** Short hint for tooltip / quick context (i18n). */
  hintKey: TranslationKey;
};

export const ANIMATION_INTENTS = {
  morph: {
    prompt:
      "The same subject transforms smoothly into the next image, preserving structure and identity.",
    descriptionKey: "animate.intent.morph.description",
    hintKey: "animate.intent.morph.hint",
  },
  cinematic: {
    prompt:
      "Scene evolves with cinematic camera movement, soft zoom, and natural motion.",
    descriptionKey: "animate.intent.cinematic.description",
    hintKey: "animate.intent.cinematic.hint",
  },
  product: {
    prompt:
      "Product remains central and transforms cleanly into the next scene with controlled motion.",
    descriptionKey: "animate.intent.product.description",
    hintKey: "animate.intent.product.hint",
  },
  dynamic: {
    prompt: "Energetic transformation with dynamic motion, faster evolution between scenes.",
    descriptionKey: "animate.intent.dynamic.description",
    hintKey: "animate.intent.dynamic.hint",
  },
} as const satisfies Record<string, IntentDefinition>;

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
