import { getAllMotionActionPresets } from "@/lib/motion-action-presets";
import type { MotionActionPresetId } from "@/types/motion-action-presets";
import type {
  ActionPresetRequirement,
  ActionPresetRequirementId,
} from "@/types/action-preset-requirements";

export type ActionPresetRequirementProfile = {
  presetId: MotionActionPresetId;
  required: ActionPresetRequirementId[];
  optional: ActionPresetRequirementId[];
};

const req = (
  id: ActionPresetRequirementId,
  category: ActionPresetRequirement["category"],
  label: string,
  assetType: ActionPresetRequirement["assetType"],
  options: {
    required?: boolean;
    autoGeneratable?: boolean;
    preferredSource?: ActionPresetRequirement["preferredSource"];
  } = {}
): ActionPresetRequirement => ({
  id,
  category,
  label,
  labelKey: `assistant.requirements.${id}`,
  required: options.required ?? false,
  autoGeneratable: options.autoGeneratable ?? true,
  assetType,
  preferredSource: options.preferredSource ?? ["library_character", "upload", "generate"],
});

export const ACTION_PRESET_REQUIREMENT_CATALOG: Record<
  ActionPresetRequirementId,
  ActionPresetRequirement
> = {
  person_character: req("person_character", "character", "Personage / foto van jou", "person_character", {
    required: true,
    autoGeneratable: false,
    preferredSource: ["library_character", "upload", "project_assets"],
  }),
  football_outfit: req("football_outfit", "outfit", "Voetbaltenue", "outfit", {
    autoGeneratable: true,
    preferredSource: ["library_fusion", "generate", "upload"],
  }),
  sports_outfit: req("sports_outfit", "outfit", "Sportoutfit", "outfit", {
    autoGeneratable: true,
    preferredSource: ["library_fusion", "generate", "upload"],
  }),
  basketball_outfit: req("basketball_outfit", "outfit", "Basketbaltenue", "outfit", {
    autoGeneratable: true,
    preferredSource: ["library_fusion", "generate", "upload"],
  }),
  cycling_outfit: req("cycling_outfit", "outfit", "Wielrenoutfit", "outfit", {
    autoGeneratable: true,
    preferredSource: ["library_fusion", "generate", "upload"],
  }),
  dance_outfit: req("dance_outfit", "outfit", "Dansoutfit", "outfit", {
    autoGeneratable: true,
    preferredSource: ["library_fusion", "generate", "upload"],
  }),
  fashion_outfit: req("fashion_outfit", "outfit", "Mode-outfit", "outfit", {
    autoGeneratable: true,
    preferredSource: ["library_fusion", "generate", "upload"],
  }),
  hiking_outfit: req("hiking_outfit", "outfit", "Outdoor outfit", "outfit", {
    autoGeneratable: true,
    preferredSource: ["library_fusion", "generate", "upload"],
  }),
  luxury_outfit: req("luxury_outfit", "outfit", "Luxe outfit", "outfit", {
    autoGeneratable: true,
    preferredSource: ["library_fusion", "generate", "upload"],
  }),
  stadium_location: req("stadium_location", "location", "Stadion", "location", {
    autoGeneratable: true,
    preferredSource: ["library_reference", "generate", "preset_default"],
  }),
  mountain_location: req("mountain_location", "location", "Bergtop / berglandschap", "location", {
    autoGeneratable: true,
    preferredSource: ["library_reference", "generate", "preset_default"],
  }),
  city_location: req("city_location", "location", "Stad / straat", "location", {
    autoGeneratable: true,
    preferredSource: ["library_reference", "generate", "preset_default"],
  }),
  beach_location: req("beach_location", "location", "Strand", "location", {
    autoGeneratable: true,
    preferredSource: ["library_reference", "generate", "preset_default"],
  }),
  stage: req("stage", "location", "Podium", "location", {
    autoGeneratable: true,
    preferredSource: ["library_reference", "generate", "preset_default"],
  }),
  red_carpet: req("red_carpet", "background", "Rode loper", "background", {
    autoGeneratable: true,
    preferredSource: ["library_reference", "generate", "preset_default"],
  }),
  luxury_background: req("luxury_background", "background", "Luxe achtergrond", "background", {
    autoGeneratable: true,
    preferredSource: ["library_reference", "generate", "preset_default"],
  }),
  background: req("background", "background", "Achtergrond", "background", {
    autoGeneratable: true,
    preferredSource: ["library_reference", "generate", "preset_default"],
  }),
  crowd: req("crowd", "crowd", "Publiek / menigte", "crowd", {
    autoGeneratable: true,
    preferredSource: ["preset_default", "generate"],
  }),
  trophy: req("trophy", "prop", "Trofee", "prop", {
    autoGeneratable: true,
    preferredSource: ["upload", "generate", "preset_default"],
  }),
  confetti: req("confetti", "prop", "Confetti", "prop", {
    autoGeneratable: false,
    preferredSource: ["preset_default"],
  }),
  sports_car: req("sports_car", "vehicle", "Sportwagen", "vehicle", {
    autoGeneratable: true,
    preferredSource: ["library_reference", "upload", "generate"],
  }),
  vehicle: req("vehicle", "vehicle", "Voertuig", "vehicle", {
    autoGeneratable: true,
    preferredSource: ["library_reference", "upload", "generate"],
  }),
  skateboard: req("skateboard", "prop", "Skateboard", "prop", {
    autoGeneratable: true,
    preferredSource: ["upload", "generate", "preset_default"],
  }),
  snowboard: req("snowboard", "prop", "Snowboard", "prop", {
    autoGeneratable: true,
    preferredSource: ["upload", "generate", "preset_default"],
  }),
  microphone: req("microphone", "prop", "Microfoon", "prop", {
    autoGeneratable: false,
    preferredSource: ["preset_default", "upload"],
  }),
  reporter: req("reporter", "prop", "Reporter", "prop", {
    autoGeneratable: true,
    preferredSource: ["preset_default", "generate"],
  }),
  logo: req("logo", "logo", "Logo", "logo", {
    autoGeneratable: true,
    preferredSource: ["project_assets", "library_fusion", "upload"],
  }),
  mascot: req("mascot", "mascot", "Mascotte", "mascot", {
    autoGeneratable: false,
    preferredSource: ["project_assets", "library_character"],
  }),
  sports_music: req("sports_music", "music", "Sportmuziek", "music", {
    autoGeneratable: true,
    preferredSource: ["library_music", "preset_default"],
  }),
  music: req("music", "music", "Muziek", "music", {
    autoGeneratable: true,
    preferredSource: ["library_music", "preset_default"],
  }),
  sfx: req("sfx", "sfx", "Geluidseffecten", "sfx", {
    autoGeneratable: true,
    preferredSource: ["library_sfx", "preset_default"],
  }),
  voice: req("voice", "voice", "Stem", "voice", {
    autoGeneratable: false,
    preferredSource: ["library_character", "preset_default"],
  }),
  paparazzi: req("paparazzi", "crowd", "Paparazzi / flitsen", "crowd", {
    autoGeneratable: false,
    preferredSource: ["preset_default"],
  }),
  stage_lighting: req("stage_lighting", "lighting", "Podiumverlichting", "lighting", {
    autoGeneratable: false,
    preferredSource: ["preset_default"],
  }),
  finish_line: req("finish_line", "prop", "Finishlijn", "prop", {
    autoGeneratable: false,
    preferredSource: ["preset_default"],
  }),
};

/** Explicit overrides — all other presets derive from category defaults at build time. */
const EXPLICIT_ACTION_PRESET_REQUIREMENT_PROFILES: Partial<
  Record<MotionActionPresetId, ActionPresetRequirementProfile>
> = {
  goal_celebration: {
    presetId: "goal_celebration",
    required: ["person_character"],
    optional: ["football_outfit", "stadium_location", "crowd", "sports_music", "sfx"],
  },
  stadium_entrance: {
    presetId: "stadium_entrance",
    required: ["person_character"],
    optional: ["stadium_location", "crowd", "sports_outfit", "sports_music"],
  },
  championship_celebration: {
    presetId: "championship_celebration",
    required: ["person_character"],
    optional: ["trophy", "confetti", "crowd", "stadium_location", "sports_music"],
  },
  basketball_dunk_celebration: {
    presetId: "basketball_dunk_celebration",
    required: ["person_character"],
    optional: ["basketball_outfit", "stadium_location", "crowd", "sports_music"],
  },
  snowboard_jump: {
    presetId: "snowboard_jump",
    required: ["person_character"],
    optional: ["snowboard", "mountain_location", "sports_outfit", "sfx"],
  },
  skateboard_trick: {
    presetId: "skateboard_trick",
    required: ["person_character"],
    optional: ["skateboard", "city_location", "sports_outfit", "sfx"],
  },
  cycling_finish: {
    presetId: "cycling_finish",
    required: ["person_character"],
    optional: ["cycling_outfit", "finish_line", "crowd", "sports_music"],
  },
  moonwalk: {
    presetId: "moonwalk",
    required: ["person_character"],
    optional: ["stage", "dance_outfit", "stage_lighting", "music"],
  },
  stage_performance: {
    presetId: "stage_performance",
    required: ["person_character"],
    optional: ["stage", "microphone", "crowd", "music", "stage_lighting"],
  },
  fashion_runway: {
    presetId: "fashion_runway",
    required: ["person_character"],
    optional: ["fashion_outfit", "stage", "crowd", "music"],
  },
  fans_recognize_me: {
    presetId: "fans_recognize_me",
    required: ["person_character"],
    optional: ["crowd", "city_location", "sfx"],
  },
  red_carpet_moment: {
    presetId: "red_carpet_moment",
    required: ["person_character"],
    optional: ["red_carpet", "paparazzi", "luxury_outfit", "luxury_background", "music"],
  },
  street_interview: {
    presetId: "street_interview",
    required: ["person_character"],
    optional: ["reporter", "city_location", "microphone", "sfx"],
  },
  beach_comedy_scene: {
    presetId: "beach_comedy_scene",
    required: ["person_character"],
    optional: ["beach_location", "crowd", "sfx", "music"],
  },
  hero_entrance: {
    presetId: "hero_entrance",
    required: ["person_character"],
    optional: ["background", "luxury_outfit", "music", "sfx"],
  },
  sports_car_arrival: {
    presetId: "sports_car_arrival",
    required: ["person_character"],
    optional: ["sports_car", "luxury_background", "luxury_outfit", "music"],
  },
  mountain_summit: {
    presetId: "mountain_summit",
    required: ["person_character"],
    optional: ["mountain_location", "hiking_outfit", "music", "sfx"],
  },
  city_sprint: {
    presetId: "city_sprint",
    required: ["person_character"],
    optional: ["city_location", "sports_outfit", "sfx", "music"],
  },
  penalty_kick: {
    presetId: "penalty_kick",
    required: ["person_character"],
    optional: ["football_outfit", "stadium_location", "crowd", "sports_music", "sfx"],
  },
  goalkeeper_save: {
    presetId: "goalkeeper_save",
    required: ["person_character"],
    optional: ["football_outfit", "stadium_location", "crowd", "sfx"],
  },
  team_celebration: {
    presetId: "team_celebration",
    required: ["person_character"],
    optional: ["football_outfit", "stadium_location", "crowd", "sports_music"],
  },
};

function buildActionPresetRequirementProfiles(): Record<
  MotionActionPresetId,
  ActionPresetRequirementProfile
> {
  const profiles = {} as Record<MotionActionPresetId, ActionPresetRequirementProfile>;
  for (const preset of getAllMotionActionPresets()) {
    profiles[preset.id] =
      EXPLICIT_ACTION_PRESET_REQUIREMENT_PROFILES[preset.id] ??
      defaultProfileForPreset(preset);
  }
  return profiles;
}

function defaultProfileForPreset(preset: {
  id: MotionActionPresetId;
  category: string;
}): ActionPresetRequirementProfile {
  if (preset.category === "mascots") {
    return {
      presetId: preset.id,
      required: ["person_character"],
      optional: ["mascot", "stage", "crowd", "music"],
    };
  }
  if (preset.category === "business") {
    const productIds = new Set([
      "product_launch",
      "product_showcase",
      "product_unboxing",
      "brand_reveal",
    ]);
    return {
      presetId: preset.id,
      required: ["person_character"],
      optional: productIds.has(preset.id) ? ["logo", "background", "music"] : ["logo", "background", "music", "voice"],
    };
  }
  return {
    presetId: preset.id,
    required: ["person_character"],
    optional: ["background", "music", "sfx"],
  };
}

export const ACTION_PRESET_REQUIREMENT_PROFILES = buildActionPresetRequirementProfiles();

export function getActionPresetRequirementProfile(
  presetId: MotionActionPresetId
): ActionPresetRequirementProfile {
  return (
    ACTION_PRESET_REQUIREMENT_PROFILES[presetId] ??
    defaultProfileForPreset({ id: presetId, category: "social" })
  );
}

export function getActionPresetRequirement(
  requirementId: ActionPresetRequirementId
): ActionPresetRequirement {
  return ACTION_PRESET_REQUIREMENT_CATALOG[requirementId];
}

export function listRequirementsForPreset(presetId: MotionActionPresetId): ActionPresetRequirement[] {
  const profile = getActionPresetRequirementProfile(presetId);
  return [
    ...profile.required.map((id) => ({ ...getActionPresetRequirement(id), required: true })),
    ...profile.optional.map((id) => ({ ...getActionPresetRequirement(id), required: false })),
  ];
}

export function validateActionPresetRequirementProfiles(): string[] {
  const errors: string[] = [];
  for (const [presetId, profile] of Object.entries(ACTION_PRESET_REQUIREMENT_PROFILES)) {
    if (profile.required.length === 0) {
      errors.push(`${presetId}: no required requirements`);
    }
    if (!profile.required.includes("person_character")) {
      errors.push(`${presetId}: person_character must be required`);
    }
    for (const id of [...profile.required, ...profile.optional]) {
      if (!ACTION_PRESET_REQUIREMENT_CATALOG[id]) {
        errors.push(`${presetId}: unknown requirement ${id}`);
      }
    }
  }
  return errors;
}
