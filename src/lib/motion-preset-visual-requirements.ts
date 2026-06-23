import { getMotionActionPreset } from "@/lib/motion-action-presets";
import type { MotionActionPresetId } from "@/types/motion-action-presets";
import type {
  MotionPresetVisualRequirements,
  MotionVisualRequirementId,
} from "@/types/motion-preset-engine";

const CATEGORY_DEFAULTS: Record<
  string,
  Pick<MotionPresetVisualRequirements, "required" | "preferred" | "analysisRequirements" | "identityRequirements">
> = {
  sports: {
    required: ["face_visible", "full_body_visible"],
    preferred: ["legs_visible", "shoes_visible"],
    analysisRequirements: ["style_dna", "identity_fingerprint", "motion_readiness"],
    identityRequirements: ["face", "hair", "body", "clothing"],
  },
  dance: {
    required: ["face_visible", "full_body_visible"],
    preferred: ["shoes_visible", "standing_pose"],
    analysisRequirements: ["style_dna", "identity_fingerprint", "motion_readiness"],
    identityRequirements: ["face", "hair", "body", "clothing"],
  },
  comedy: {
    required: ["face_visible"],
    preferred: ["full_body_visible"],
    analysisRequirements: ["style_dna", "identity_fingerprint"],
    identityRequirements: ["face", "hair", "clothing"],
  },
  adventure: {
    required: ["face_visible"],
    preferred: ["full_body_visible"],
    analysisRequirements: ["style_dna", "identity_fingerprint"],
    identityRequirements: ["face", "hair", "body", "clothing"],
  },
  lifestyle: {
    required: ["face_visible"],
    preferred: ["upper_body_visible"],
    analysisRequirements: ["style_dna", "identity_fingerprint"],
    identityRequirements: ["face", "hair", "clothing"],
  },
  business: {
    required: ["face_visible"],
    preferred: ["upper_body_visible"],
    analysisRequirements: ["style_dna", "brand_detection", "text_risk"],
    identityRequirements: ["face", "clothing", "brand_colors"],
  },
  social: {
    required: ["face_visible"],
    preferred: ["upper_body_visible"],
    analysisRequirements: ["style_dna", "identity_fingerprint"],
    identityRequirements: ["face", "hair", "clothing"],
  },
  mascots: {
    required: ["mascot_reference", "face_visible"],
    preferred: ["full_body_visible"],
    analysisRequirements: ["style_dna", "mascot_detection", "identity_fingerprint"],
    identityRequirements: ["mascot_traits", "brand_colors", "logo"],
  },
};

const PRESET_OVERRIDES: Partial<
  Record<MotionActionPresetId, Partial<MotionPresetVisualRequirements>>
> = {
  moonwalk: {
    required: ["face_visible", "full_body_visible"],
    preferred: ["standing_pose", "shoes_visible"],
  },
  penalty_kick: {
    required: ["face_visible", "full_body_visible", "legs_visible"],
    preferred: ["shoes_visible"],
  },
  podcast_clip: {
    required: ["face_visible", "upper_body_visible"],
    preferred: ["standing_pose"],
  },
  business_presentation: {
    required: ["face_visible", "upper_body_visible"],
    preferred: ["standing_pose"],
  },
  startup_pitch: {
    required: ["face_visible", "upper_body_visible"],
    preferred: ["standing_pose"],
  },
  product_launch: {
    required: ["product_reference"],
    preferred: ["face_visible", "upper_body_visible"],
    analysisRequirements: ["style_dna", "brand_detection", "identity_fingerprint"],
    identityRequirements: ["brand_colors", "logo", "face", "clothing"],
  },
  product_showcase: {
    required: ["product_reference"],
    preferred: ["face_visible", "upper_body_visible"],
  },
  product_unboxing: {
    required: ["product_reference"],
    preferred: ["face_visible", "upper_body_visible"],
  },
  brand_reveal: {
    required: ["logo_reference"],
    preferred: ["face_visible", "product_reference"],
    analysisRequirements: ["brand_detection", "style_dna", "text_risk"],
    identityRequirements: ["logo", "brand_colors"],
  },
  mascot_commercial: {
    required: ["mascot_reference"],
    preferred: ["full_body_visible"],
  },
  mascot_introduction: {
    required: ["mascot_reference"],
    preferred: ["full_body_visible", "face_visible"],
  },
  mascot_greeting: {
    required: ["mascot_reference"],
    preferred: ["full_body_visible"],
  },
  mascot_celebration: {
    required: ["mascot_reference"],
    preferred: ["full_body_visible"],
  },
  mascot_presentation: {
    required: ["mascot_reference"],
    preferred: ["full_body_visible", "upper_body_visible"],
  },
  street_interview: {
    required: ["face_visible", "upper_body_visible"],
    preferred: ["standing_pose"],
  },
  press_conference: {
    required: ["face_visible", "upper_body_visible"],
    preferred: ["standing_pose"],
  },
};

export function resolveMotionPresetVisualRequirements(
  presetId: MotionActionPresetId
): MotionPresetVisualRequirements {
  const preset = getMotionActionPreset(presetId);
  const categoryDefaults = CATEGORY_DEFAULTS[preset?.category ?? "social"] ?? CATEGORY_DEFAULTS.social!;
  const override = PRESET_OVERRIDES[presetId] ?? {};
  return {
    presetId,
    required: override.required ?? categoryDefaults.required,
    preferred: override.preferred ?? categoryDefaults.preferred,
    analysisRequirements:
      override.analysisRequirements ?? categoryDefaults.analysisRequirements,
    identityRequirements:
      override.identityRequirements ?? categoryDefaults.identityRequirements,
  };
}

export function listMotionVisualRequirementIds(): MotionVisualRequirementId[] {
  return [
    "face_visible",
    "full_body_visible",
    "upper_body_visible",
    "legs_visible",
    "shoes_visible",
    "standing_pose",
    "product_reference",
    "mascot_reference",
    "logo_reference",
  ];
}
