import type { InstantPremiumContinuityStrength, InstantPremiumStylePreset } from "@/lib/instant-premium-prompt";
import {
  normalizeStudioContinuityStrength,
  type StudioContinuityStrength,
} from "@/lib/studio-continuity-strength";
import {
  normalizeStudioPromptStyleProfile,
  type StudioPromptStyleProfile,
} from "@/lib/studio-prompt-style-profiles";

/** Map Studio storyboard style profile to Motion wizard style preset. */
export function mapStudioStyleProfileToWizardPreset(
  profile: StudioPromptStyleProfile | string | null | undefined
): InstantPremiumStylePreset {
  const normalized = normalizeStudioPromptStyleProfile(profile);
  switch (normalized) {
    case "social_media":
      return "social_boost";
    case "cinematic":
    case "documentary":
    case "corporate":
      return "clean_business";
    case "children_story":
    case "commercial":
    default:
      return "food_promo";
  }
}

/** Map Studio continuity strength to Motion wizard continuity (balanced | strict). */
export function mapStudioContinuityToWizardStrength(
  strength: StudioContinuityStrength | string | null | undefined
): InstantPremiumContinuityStrength {
  const normalized = normalizeStudioContinuityStrength(strength);
  return normalized === "strict" || normalized === "strong" ? "strict" : "balanced";
}
