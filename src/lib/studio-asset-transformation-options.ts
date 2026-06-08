import type { WizardChoiceStepDef, WizardChoiceOption } from "@/lib/studio-asset-wizard-choices";
import type { AssetDerivationSourceListItem } from "@/types/studio-asset-derivation";
import type { StudioAssetKind } from "@/types/studio-asset-creation";

/** Roles detected from a user's library — shown as recommended, not global defaults. */
export const LIBRARY_ROLE_IDS = ["chef", "garden", "designer", "community"] as const;

const GENERIC_CHARACTER_ROLE_IDS = [
  "host",
  "mascot",
  "narrator",
  "founder",
  "customer",
  "expert",
] as const;

const GENERIC_PROP_ROLE_IDS = [
  "product_variant",
  "packaging",
  "premium",
  "seasonal",
  "branded",
] as const;

const GENERIC_LOCATION_ROLE_IDS = ["day", "night", "premium", "local", "cinematic"] as const;

const ROLE_EMOJI: Record<string, string> = {
  chef: "👨‍🍳",
  garden: "🌿",
  designer: "✏️",
  community: "🤝",
  host: "🎤",
  mascot: "🎭",
  narrator: "🎙️",
  founder: "🚀",
  customer: "🛒",
  expert: "🎓",
  product_variant: "🔁",
  packaging: "📦",
  premium: "💎",
  seasonal: "🍂",
  branded: "🏷️",
  day: "☀️",
  night: "🌙",
  local: "📍",
  cinematic: "🎬",
  winter: "❄️",
  tropical: "🌴",
  market: "🏪",
  evening: "🌆",
  custom: "✨",
};

export function detectRecommendedRoleIds(sources: AssetDerivationSourceListItem[]): string[] {
  const found = new Set<string>();
  for (const item of sources) {
    const role = item.canonicalRole?.trim().toLowerCase();
    if (role && (LIBRARY_ROLE_IDS as readonly string[]).includes(role)) {
      found.add(role);
    }
    const name = item.name.toLowerCase();
    for (const id of LIBRARY_ROLE_IDS) {
      if (name.includes(id)) {
        found.add(id);
      }
    }
  }
  return [...found];
}

function characterTypeOption(id: string): WizardChoiceOption {
  return {
    id,
    labelKey: `studio.assetCreation.choices.character_type.${id}`,
    emoji: ROLE_EMOJI[id],
  };
}

function derivationOption(
  kind: "character" | "prop" | "location",
  id: string
): WizardChoiceOption {
  return {
    id,
    labelKey: `studio.assetDerivation.transform.${kind}.${id}`,
    emoji: ROLE_EMOJI[id],
  };
}

function buildRoleOptions(
  prefix: "character_type" | "derivation",
  kind: "character" | "prop" | "location",
  recommendedIds: string[],
  genericIds: readonly string[]
): WizardChoiceOption[] {
  const seen = new Set<string>();
  const options: WizardChoiceOption[] = [];
  const mapOption = (id: string) =>
    prefix === "character_type" ? characterTypeOption(id) : derivationOption(kind, id);

  for (const id of recommendedIds) {
    if (seen.has(id)) {
      continue;
    }
    seen.add(id);
    options.push(mapOption(id));
  }
  for (const id of genericIds) {
    if (seen.has(id)) {
      continue;
    }
    seen.add(id);
    options.push(mapOption(id));
  }
  options.push(mapOption("custom"));
  if (options.at(-1)) {
    options[options.length - 1] = {
      id: "custom",
      labelKey: "studio.assetCreation.choices.common.custom",
      emoji: "✨",
    };
  }
  return options;
}

export function buildCharacterTypeChoiceDef(
  sources: AssetDerivationSourceListItem[]
): WizardChoiceStepDef {
  const recommended = detectRecommendedRoleIds(sources);
  return {
    id: "character_type",
    titleKey: "studio.assetCreation.choices.character_type.title",
    hintKey:
      recommended.length > 0
        ? "studio.assetCreation.choices.character_type.hintRecommended"
        : "studio.assetCreation.choices.character_type.hint",
    options: buildRoleOptions("character_type", "character", recommended, GENERIC_CHARACTER_ROLE_IDS),
    allowsCustom: true,
  };
}

export function buildDerivationTransformDef(
  kind: StudioAssetKind,
  sources: AssetDerivationSourceListItem[]
): WizardChoiceStepDef | null {
  if (kind === "character") {
    const recommended = detectRecommendedRoleIds(sources);
    return {
      id: "derivation_transform",
      titleKey: "studio.assetDerivation.transform.character.title",
      hintKey:
        recommended.length > 0
          ? "studio.assetDerivation.transform.character.hintRecommended"
          : "studio.assetDerivation.transform.character.hint",
      options: buildRoleOptions("derivation", "character", recommended, GENERIC_CHARACTER_ROLE_IDS),
      allowsCustom: true,
    };
  }
  if (kind === "prop") {
    return {
      id: "derivation_transform",
      titleKey: "studio.assetDerivation.transform.prop.title",
      hintKey: "studio.assetDerivation.transform.prop.hint",
      options: buildRoleOptions("derivation", "prop", [], GENERIC_PROP_ROLE_IDS),
      allowsCustom: true,
    };
  }
  if (kind === "location") {
    return {
      id: "derivation_transform",
      titleKey: "studio.assetDerivation.transform.location.title",
      hintKey: "studio.assetDerivation.transform.location.hint",
      options: buildRoleOptions("derivation", "location", [], GENERIC_LOCATION_ROLE_IDS),
      allowsCustom: true,
    };
  }
  return null;
}

const SOURCE_CHARACTER_EXTRA_IDS = ["winter", "premium"] as const;
const SOURCE_PROP_EXTRA_IDS = ["market", "seasonal"] as const;
const SOURCE_LOCATION_EXTRA_IDS = ["tropical", "market", "evening"] as const;

function sourceTransformOption(
  kind: "character" | "prop" | "location",
  id: string
): WizardChoiceOption {
  return {
    id,
    labelKey: `studio.assetCreation.sourceTransform.${kind}.${id}`,
    emoji: ROLE_EMOJI[id],
  };
}

export function buildSourceTransformChoiceDef(
  kind: StudioAssetKind,
  sources: AssetDerivationSourceListItem[]
): WizardChoiceStepDef | null {
  if (kind === "character") {
    const recommended = detectRecommendedRoleIds(sources);
    const options = buildRoleOptions("derivation", "character", recommended, GENERIC_CHARACTER_ROLE_IDS);
    for (const id of SOURCE_CHARACTER_EXTRA_IDS) {
      if (!options.some((o) => o.id === id)) {
        options.splice(options.length - 1, 0, sourceTransformOption("character", id));
      }
    }
    return {
      id: "source_transform",
      titleKey: "studio.assetCreation.sourceTransform.title",
      hintKey:
        recommended.length > 0
          ? "studio.assetCreation.sourceTransform.hintRecommended"
          : "studio.assetCreation.sourceTransform.hint",
      options: options.map((o) => ({
        ...o,
        labelKey: o.labelKey.replace(
          "studio.assetDerivation.transform.character.",
          "studio.assetCreation.sourceTransform.character."
        ),
      })),
      allowsCustom: true,
    };
  }
  if (kind === "prop") {
    const options = buildRoleOptions("derivation", "prop", [], GENERIC_PROP_ROLE_IDS);
    for (const id of SOURCE_PROP_EXTRA_IDS) {
      if (!options.some((o) => o.id === id)) {
        options.splice(options.length - 1, 0, sourceTransformOption("prop", id));
      }
    }
    return {
      id: "source_transform",
      titleKey: "studio.assetCreation.sourceTransform.title",
      hintKey: "studio.assetCreation.sourceTransform.hint",
      options: options.map((o) => ({
        ...o,
        labelKey: o.labelKey.replace("studio.assetDerivation.transform.prop.", "studio.assetCreation.sourceTransform.prop."),
      })),
      allowsCustom: true,
    };
  }
  if (kind === "location") {
    const options = buildRoleOptions("derivation", "location", [], GENERIC_LOCATION_ROLE_IDS);
    for (const id of SOURCE_LOCATION_EXTRA_IDS) {
      if (!options.some((o) => o.id === id)) {
        options.splice(options.length - 1, 0, sourceTransformOption("location", id));
      }
    }
    return {
      id: "source_transform",
      titleKey: "studio.assetCreation.sourceTransform.title",
      hintKey: "studio.assetCreation.sourceTransform.hint",
      options: options.map((o) => ({
        ...o,
        labelKey: o.labelKey.replace("studio.assetDerivation.transform.location.", "studio.assetCreation.sourceTransform.location."),
      })),
      allowsCustom: true,
    };
  }
  return null;
}

export function resolveWizardChoiceDef(
  kind: StudioAssetKind,
  stepDef: WizardChoiceStepDef | null,
  sources: AssetDerivationSourceListItem[]
): WizardChoiceStepDef | null {
  if (!stepDef) {
    return null;
  }
  if (stepDef.id === "character_type" && kind === "character") {
    return buildCharacterTypeChoiceDef(sources);
  }
  return stepDef;
}
