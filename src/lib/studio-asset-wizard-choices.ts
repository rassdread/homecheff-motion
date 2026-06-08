import type { StudioAssetKind } from "@/types/studio-asset-creation";
import type { AssetCreationWizardStep } from "@/types/studio-asset-creation";

/** One guided choice screen (chip grid). */
export type WizardChoiceStepDef = {
  id: string;
  /** i18n key for step title */
  titleKey: string;
  /** i18n key for step hint */
  hintKey?: string;
  options: WizardChoiceOption[];
  /** Allow proceeding without a selection (e.g. voice skip). */
  optional?: boolean;
  /** Show free-text input when option `custom` is selected. */
  allowsCustom?: boolean;
};

export type WizardChoiceOption = {
  id: string;
  /** i18n key under studio.assetCreation.choices.* */
  labelKey: string;
  emoji?: string;
};

export const CHARACTER_WIZARD_CHOICE_IDS = [
  "character_type",
  "character_style",
  "character_shape",
  "character_personality",
  "character_outfit",
  "character_world",
  "character_voice",
] as const;

export const PROP_WIZARD_CHOICE_IDS = [
  "prop_category",
  "prop_style",
  "prop_material",
  "prop_color",
  "prop_usage",
] as const;

export const LOCATION_WIZARD_CHOICE_IDS = [
  "location_type",
  "location_mood",
  "location_architecture",
  "location_lighting",
] as const;

export const WORLD_WIZARD_CHOICE_IDS = [
  "world_genre",
  "world_rules",
  "world_color",
  "world_mood",
] as const;

export type CharacterWizardChoiceId = (typeof CHARACTER_WIZARD_CHOICE_IDS)[number];
export type PropWizardChoiceId = (typeof PROP_WIZARD_CHOICE_IDS)[number];
export type LocationWizardChoiceId = (typeof LOCATION_WIZARD_CHOICE_IDS)[number];
export type WorldWizardChoiceId = (typeof WORLD_WIZARD_CHOICE_IDS)[number];

export type WizardChoiceId =
  | CharacterWizardChoiceId
  | PropWizardChoiceId
  | LocationWizardChoiceId
  | WorldWizardChoiceId;

function opts(ids: Array<{ id: string; labelKey: string; emoji?: string }>): WizardChoiceOption[] {
  return ids.map((o) => ({
    id: o.id,
    labelKey: `studio.assetCreation.choices.${o.labelKey}`,
    emoji: o.emoji,
  }));
}

export const CHARACTER_WIZARD_CHOICES: WizardChoiceStepDef[] = [
  {
    id: "character_type",
    titleKey: "studio.assetCreation.choices.character_type.title",
    hintKey: "studio.assetCreation.choices.character_type.hint",
    options: opts([
      { id: "chef", labelKey: "character_type.chef", emoji: "👨‍🍳" },
      { id: "garden", labelKey: "character_type.garden", emoji: "🌿" },
      { id: "designer", labelKey: "character_type.designer", emoji: "✏️" },
      { id: "mascot", labelKey: "character_type.mascot", emoji: "🎭" },
      { id: "human", labelKey: "character_type.human", emoji: "🧑" },
      { id: "narrator", labelKey: "character_type.narrator", emoji: "🎙️" },
      { id: "custom", labelKey: "common.custom", emoji: "✨" },
    ]),
    allowsCustom: true,
  },
  {
    id: "character_style",
    titleKey: "studio.assetCreation.choices.character_style.title",
    options: opts([
      { id: "flat_cartoon", labelKey: "character_style.cartoon", emoji: "🎨" },
      { id: "3d_cartoon", labelKey: "character_style.cartoon3d", emoji: "🧊" },
      { id: "cinematic", labelKey: "character_style.cinematic", emoji: "🎬" },
      { id: "comic", labelKey: "character_style.comic", emoji: "💥" },
      { id: "storybook", labelKey: "character_style.storybook", emoji: "📖" },
    ]),
  },
  {
    id: "character_shape",
    titleKey: "studio.assetCreation.choices.character_shape.title",
    options: opts([
      { id: "rounded", labelKey: "character_shape.rounded", emoji: "⭕" },
      { id: "playful", labelKey: "character_shape.playful", emoji: "🎈" },
      { id: "premium", labelKey: "character_shape.premium", emoji: "💎" },
      { id: "energetic", labelKey: "character_shape.energetic", emoji: "⚡" },
      { id: "calm", labelKey: "character_shape.calm", emoji: "🌊" },
    ]),
  },
  {
    id: "character_personality",
    titleKey: "studio.assetCreation.choices.character_personality.title",
    options: opts([
      { id: "warm", labelKey: "character_personality.friendly", emoji: "😊" },
      { id: "funny", labelKey: "character_personality.funny", emoji: "😄" },
      { id: "professional", labelKey: "character_personality.professional", emoji: "💼" },
      { id: "inspiring", labelKey: "character_personality.inspiring", emoji: "✨" },
      { id: "community", labelKey: "character_personality.community", emoji: "🤝" },
    ]),
  },
  {
    id: "character_outfit",
    titleKey: "studio.assetCreation.choices.character_outfit.title",
    options: opts([
      { id: "chef", labelKey: "character_outfit.chef", emoji: "👨‍🍳" },
      { id: "garden", labelKey: "character_outfit.garden", emoji: "🧤" },
      { id: "designer", labelKey: "character_outfit.designer", emoji: "🧥" },
      { id: "custom", labelKey: "common.custom", emoji: "✨" },
    ]),
    allowsCustom: true,
  },
  {
    id: "character_world",
    titleKey: "studio.assetCreation.choices.character_world.title",
    options: opts([
      { id: "homecheff", labelKey: "character_world.homecheff", emoji: "🏠" },
      { id: "garden", labelKey: "character_world.garden", emoji: "🌻" },
      { id: "market", labelKey: "character_world.market", emoji: "🛒" },
      { id: "studio", labelKey: "character_world.studio", emoji: "🎬" },
      { id: "custom", labelKey: "common.custom", emoji: "🌍" },
    ]),
    allowsCustom: true,
  },
  {
    id: "character_voice",
    titleKey: "studio.assetCreation.choices.character_voice.title",
    hintKey: "studio.assetCreation.choices.character_voice.hint",
    optional: true,
    options: opts([
      { id: "recommended", labelKey: "character_voice.recommended", emoji: "⭐" },
      { id: "persona", labelKey: "character_voice.persona", emoji: "🎭" },
      { id: "my_voice", labelKey: "character_voice.myVoice", emoji: "🎤" },
      { id: "skip", labelKey: "character_voice.skip", emoji: "⏭️" },
    ]),
  },
];

export const PROP_WIZARD_CHOICES: WizardChoiceStepDef[] = [
  {
    id: "prop_category",
    titleKey: "studio.assetCreation.choices.prop_category.title",
    options: opts([
      { id: "food", labelKey: "prop_category.food", emoji: "🍲" },
      { id: "tool", labelKey: "prop_category.tool", emoji: "🔧" },
      { id: "transport", labelKey: "prop_category.vehicle", emoji: "🚗" },
      { id: "clothing", labelKey: "prop_category.clothing", emoji: "👕" },
      { id: "brand_asset", labelKey: "prop_category.packaging", emoji: "📦" },
      { id: "decoration", labelKey: "prop_category.decor", emoji: "🪴" },
      { id: "other", labelKey: "prop_category.other", emoji: "📎" },
    ]),
  },
  {
    id: "prop_style",
    titleKey: "studio.assetCreation.choices.prop_style.title",
    options: opts([
      { id: "cartoon", labelKey: "prop_style.cartoon", emoji: "🎨" },
      { id: "realistic", labelKey: "prop_style.realistic", emoji: "📷" },
      { id: "cinematic", labelKey: "prop_style.cinematic", emoji: "🎬" },
      { id: "premium", labelKey: "prop_style.brand", emoji: "✨" },
      { id: "artisan", labelKey: "prop_style.vintage", emoji: "🏺" },
    ]),
  },
  {
    id: "prop_material",
    titleKey: "studio.assetCreation.choices.prop_material.title",
    options: opts([
      { id: "wood", labelKey: "prop_material.wood", emoji: "🪵" },
      { id: "metal", labelKey: "prop_material.metal", emoji: "🔩" },
      { id: "fabric", labelKey: "prop_material.fabric", emoji: "🧵" },
      { id: "glass", labelKey: "prop_material.glass", emoji: "🫙" },
      { id: "plastic", labelKey: "prop_material.plastic", emoji: "🧴" },
      { id: "organic", labelKey: "prop_material.organic", emoji: "🌿" },
    ]),
  },
  {
    id: "prop_color",
    titleKey: "studio.assetCreation.choices.prop_color.title",
    options: opts([
      { id: "homecheff", labelKey: "prop_color.homecheff", emoji: "🟢" },
      { id: "warm", labelKey: "prop_color.warm", emoji: "🟠" },
      { id: "pastel", labelKey: "prop_color.pastel", emoji: "🩷" },
      { id: "dark", labelKey: "prop_color.dark", emoji: "🌑" },
      { id: "custom", labelKey: "common.custom", emoji: "🎨" },
    ]),
    allowsCustom: true,
  },
  {
    id: "prop_usage",
    titleKey: "studio.assetCreation.choices.prop_usage.title",
    options: opts([
      { id: "held", labelKey: "prop_usage.held", emoji: "🤲" },
      { id: "table", labelKey: "prop_usage.table", emoji: "🍽️" },
      { id: "background", labelKey: "prop_usage.background", emoji: "🖼️" },
      { id: "hero", labelKey: "prop_usage.hero", emoji: "⭐" },
    ]),
  },
];

export const LOCATION_WIZARD_CHOICES: WizardChoiceStepDef[] = [
  {
    id: "location_type",
    titleKey: "studio.assetCreation.choices.location_type.title",
    options: opts([
      { id: "kitchen", labelKey: "location_type.kitchen", emoji: "🍳" },
      { id: "market", labelKey: "location_type.market", emoji: "🛒" },
      { id: "garden", labelKey: "location_type.garden", emoji: "🌻" },
      { id: "street", labelKey: "location_type.street", emoji: "🏙️" },
      { id: "shop", labelKey: "location_type.shop", emoji: "🏪" },
      { id: "studio_room", labelKey: "location_type.studio", emoji: "🎬" },
      { id: "festival", labelKey: "location_type.festival", emoji: "🎉" },
      { id: "custom", labelKey: "common.custom", emoji: "✨" },
    ]),
    allowsCustom: true,
  },
  {
    id: "location_mood",
    titleKey: "studio.assetCreation.choices.location_mood.title",
    options: opts([
      { id: "warm", labelKey: "location_mood.warm", emoji: "☀️" },
      { id: "busy", labelKey: "location_mood.busy", emoji: "🚶" },
      { id: "calm", labelKey: "location_mood.calm", emoji: "🌿" },
      { id: "luxury", labelKey: "location_mood.luxury", emoji: "💎" },
      { id: "community", labelKey: "location_mood.community", emoji: "🤝" },
      { id: "cinematic", labelKey: "location_mood.cinematic", emoji: "🎬" },
    ]),
  },
  {
    id: "location_architecture",
    titleKey: "studio.assetCreation.choices.location_architecture.title",
    options: opts([
      { id: "modern", labelKey: "location_architecture.modern", emoji: "🏢" },
      { id: "classic", labelKey: "location_architecture.traditional", emoji: "🏛️" },
      { id: "urban", labelKey: "location_architecture.urban", emoji: "🌆" },
      { id: "tropical", labelKey: "location_architecture.tropical", emoji: "🌴" },
      { id: "local", labelKey: "location_architecture.european", emoji: "🏘️" },
      { id: "rural", labelKey: "location_architecture.caribbean", emoji: "🏝️" },
    ]),
  },
  {
    id: "location_lighting",
    titleKey: "studio.assetCreation.choices.location_lighting.title",
    options: opts([
      { id: "daylight", labelKey: "location_lighting.day", emoji: "☀️" },
      { id: "golden_hour", labelKey: "location_lighting.goldenHour", emoji: "🌅" },
      { id: "evening", labelKey: "location_lighting.evening", emoji: "🌆" },
      { id: "night", labelKey: "location_lighting.night", emoji: "🌙" },
      { id: "neon", labelKey: "location_lighting.neon", emoji: "💡" },
    ]),
  },
];

export const WORLD_WIZARD_CHOICES: WizardChoiceStepDef[] = [
  {
    id: "world_genre",
    titleKey: "studio.assetCreation.choices.world_genre.title",
    options: opts([
      { id: "homecheff", labelKey: "world_genre.homecheff", emoji: "🏠" },
      { id: "warm_local", labelKey: "world_genre.local", emoji: "🌻" },
      { id: "cinematic", labelKey: "world_genre.cinematic", emoji: "🎬" },
      { id: "cartoon_3d", labelKey: "world_genre.cartoon", emoji: "🎨" },
      { id: "documentary", labelKey: "world_genre.documentary", emoji: "📹" },
      { id: "sci_fi", labelKey: "world_genre.futuristic", emoji: "🚀" },
    ]),
  },
  {
    id: "world_rules",
    titleKey: "studio.assetCreation.choices.world_rules.title",
    options: opts([
      { id: "realistic", labelKey: "world_rules.realistic", emoji: "📷" },
      { id: "magical", labelKey: "world_rules.magical", emoji: "✨" },
      { id: "brand", labelKey: "world_rules.brand", emoji: "🏷️" },
      { id: "community", labelKey: "world_rules.community", emoji: "🤝" },
    ]),
  },
  {
    id: "world_color",
    titleKey: "studio.assetCreation.choices.world_color.title",
    options: opts([
      { id: "homecheff", labelKey: "world_color.homecheff", emoji: "🟢" },
      { id: "warm", labelKey: "world_color.warm", emoji: "🟠" },
      { id: "pastel", labelKey: "world_color.pastel", emoji: "🩷" },
      { id: "dark", labelKey: "world_color.dark", emoji: "🌑" },
      { id: "neon", labelKey: "world_color.neon", emoji: "💡" },
    ]),
  },
  {
    id: "world_mood",
    titleKey: "studio.assetCreation.choices.world_mood.title",
    options: opts([
      { id: "community", labelKey: "world_mood.neighborhood", emoji: "🏘️" },
      { id: "premium", labelKey: "world_mood.premium", emoji: "💎" },
      { id: "urban", labelKey: "world_mood.street", emoji: "🌆" },
      { id: "nature", labelKey: "world_mood.nature", emoji: "🌿" },
      { id: "warm_local", labelKey: "world_mood.global", emoji: "🌍" },
    ]),
  },
];

export function wizardChoiceStepsForKind(kind: StudioAssetKind): WizardChoiceStepDef[] {
  switch (kind) {
    case "character":
      return CHARACTER_WIZARD_CHOICES;
    case "prop":
      return PROP_WIZARD_CHOICES;
    case "location":
      return LOCATION_WIZARD_CHOICES;
    case "world":
      return WORLD_WIZARD_CHOICES;
    default:
      return [];
  }
}

export function kindSupportsReferenceStep(kind: StudioAssetKind): boolean {
  return kind !== "world";
}

/** Full step sequence for choice-based guided creation. */
export function wizardStepsForChoiceFlow(
  kind: StudioAssetKind,
  options?: { includeKind?: boolean }
): AssetCreationWizardStep[] {
  const steps: AssetCreationWizardStep[] = options?.includeKind ? ["kind"] : [];
  const choiceCount = wizardChoiceStepsForKind(kind).length;
  for (let i = 0; i < choiceCount; i++) {
    steps.push("choice");
  }
  if (kindSupportsReferenceStep(kind)) {
    steps.push("reference");
  }
  steps.push("readiness", "save");
  return steps;
}

export function choiceStepIndexFromWizardStep(
  stepSequence: AssetCreationWizardStep[],
  current: AssetCreationWizardStep,
  currentIndex: number
): number {
  if (current !== "choice") {
    return -1;
  }
  let choiceIdx = 0;
  for (let i = 0; i < currentIndex; i++) {
    if (stepSequence[i] === "choice") {
      choiceIdx++;
    }
  }
  return choiceIdx;
}

export function wizardChoiceDefAtIndex(kind: StudioAssetKind, index: number): WizardChoiceStepDef | null {
  const defs = wizardChoiceStepsForKind(kind);
  return defs[index] ?? null;
}

/** Map wizard chip selections → draft.fields for form conversion. */
export function applyWizardChoicesToFields(
  kind: StudioAssetKind,
  choices: Record<string, string>,
  customTexts: Record<string, string>
): Record<string, string | null> {
  const fields: Record<string, string | null> = {};

  if (kind === "character") {
    const typeId = choices.character_type;
    if (typeId === "chef") {
      fields.characterType = "brand_character";
      fields.role = "mascot";
    } else if (typeId === "garden") {
      fields.characterType = "human";
      fields.role = "human";
    } else if (typeId === "designer") {
      fields.characterType = "human";
      fields.role = "human";
    } else if (typeId === "mascot") {
      fields.characterType = "mascot";
      fields.role = "mascot";
    } else if (typeId === "host") {
      fields.characterType = "human";
      fields.role = "host";
    } else if (typeId === "founder") {
      fields.characterType = "human";
      fields.role = "founder";
    } else if (typeId === "customer") {
      fields.characterType = "human";
      fields.role = "customer";
    } else if (typeId === "expert") {
      fields.characterType = "human";
      fields.role = "expert";
    } else if (typeId === "community") {
      fields.characterType = "human";
      fields.role = "community";
    } else if (typeId === "human") {
      fields.characterType = "human";
      fields.role = "human";
    } else if (typeId === "narrator") {
      fields.characterType = "human";
      fields.role = "human";
    } else if (typeId === "custom") {
      fields.characterType = customTexts.character_type ?? "human";
      fields.role = "other";
    }

    if (choices.character_style) {
      fields.visualStyle = choices.character_style;
    }
    if (choices.character_shape) {
      const shape = choices.character_shape;
      fields.shapeLanguage =
        shape === "energetic" || shape === "calm" ? "expressive" : shape === "premium" ? "professional" : shape;
      fields.energy = shape === "energetic" ? "energetic" : shape === "calm" ? "calm" : "friendly";
    }
    if (choices.character_personality) {
      fields.personality = choices.character_personality;
    }
    if (choices.character_outfit) {
      fields.clothing =
        choices.character_outfit === "custom"
          ? (customTexts.character_outfit ?? "")
          : choices.character_outfit;
    }
    if (choices.character_world && choices.character_world !== "custom") {
      fields.worldPreset = choices.character_world;
    }
    if (choices.character_voice === "recommended") {
      fields.voiceProfile = "warm_narrator";
      fields.voiceLanguage = "nl";
    } else if (choices.character_voice === "persona") {
      fields.voiceProfile = "warm_narrator";
      fields.voiceLanguage = "nl";
    } else if (choices.character_voice === "skip" || !choices.character_voice) {
      fields.voiceProfile = null;
    }
  }

  if (kind === "prop") {
    if (choices.prop_category) {
      fields.category = choices.prop_category === "other" ? "brand_asset" : choices.prop_category;
      fields.propType = choices.prop_category === "food" ? "food" : choices.prop_category;
    }
    if (choices.prop_style) {
      const style = choices.prop_style;
      fields.styleId = style === "cartoon" ? "playful" : style === "realistic" ? "modern" : style === "cinematic" ? "premium" : style;
    }
    if (choices.prop_material) {
      fields.material = choices.prop_material === "organic" ? "wood" : choices.prop_material;
    }
    if (choices.prop_color) {
      fields.colorTheme =
        choices.prop_color === "custom" ? (customTexts.prop_color ?? "") : choices.prop_color;
    }
    if (choices.prop_usage) {
      const usageMap: Record<string, string> = {
        held: "held by character",
        table: "on table",
        background: "background object",
        hero: "hero prop",
      };
      fields.usageContext = usageMap[choices.prop_usage] ?? choices.prop_usage;
    }
  }

  if (kind === "location") {
    if (choices.location_type) {
      fields.locationType =
        choices.location_type === "custom"
          ? (customTexts.location_type ?? "")
          : choices.location_type === "festival"
            ? "market"
            : choices.location_type;
    }
    if (choices.location_mood) {
      fields.mood = choices.location_mood;
    }
    if (choices.location_architecture) {
      fields.architecture = choices.location_architecture;
    }
    if (choices.location_lighting) {
      fields.lighting = choices.location_lighting;
    }
    if (choices.location_mood === "cinematic") {
      fields.visualStyle = "cinematic";
    }
  }

  if (kind === "world") {
    if (choices.world_genre) {
      fields.worldType =
        choices.world_genre === "homecheff"
          ? "warm_local"
          : choices.world_genre === "sci_fi"
            ? "sci_fi"
            : choices.world_genre;
      fields.visualStyle = choices.world_genre === "cartoon_3d" ? "cartoon_3d" : choices.world_genre;
    }
    if (choices.world_rules) {
      const rulesMap: Record<string, string> = {
        realistic: "Grounded, realistic world rules",
        magical: "Magical realism with soft wonder",
        brand: "Strict HomeCheff brand world",
        community: "Warm community-focused world",
      };
      fields.brandRules = rulesMap[choices.world_rules] ?? choices.world_rules;
    }
    if (choices.world_color) {
      fields.colorTheme = choices.world_color;
    }
    if (choices.world_mood) {
      fields.mood = choices.world_mood;
    }
  }

  return fields;
}

export function canAdvanceFromChoiceStep(
  def: WizardChoiceStepDef,
  choices: Record<string, string>,
  customTexts: Record<string, string>
): boolean {
  if (def.optional) {
    return true;
  }
  const selected = choices[def.id];
  if (!selected) {
    return false;
  }
  if (selected === "custom" && def.allowsCustom) {
    return Boolean(customTexts[def.id]?.trim());
  }
  return true;
}

export function canAdvanceFromReferenceStep(
  referenceMode: string | null,
  referenceImageUrl: string,
  options?: {
    referenceGenerationStatus?: string;
    generatedPreviewUrl?: string;
  }
): boolean {
  if (!referenceMode) {
    return false;
  }
  if (referenceMode === "skip") {
    return true;
  }
  if (referenceMode === "upload") {
    return Boolean(referenceImageUrl);
  }
  if (referenceMode === "generate") {
    return Boolean(referenceImageUrl && referenceImageUrl.trim());
  }
  return false;
}
