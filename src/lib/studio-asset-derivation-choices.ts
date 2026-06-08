import type { WizardChoiceStepDef } from "@/lib/studio-asset-wizard-choices";
import type { StudioAssetKind } from "@/types/studio-asset-creation";

function opts(ids: Array<{ id: string; labelKey: string; emoji?: string }>) {
  return ids.map((o) => ({
    id: o.id,
    labelKey: `studio.assetDerivation.transform.${o.labelKey}`,
    emoji: o.emoji,
  }));
}

export const DERIVATION_TARGET_KIND_DEF: WizardChoiceStepDef = {
  id: "derivation_target_kind",
  titleKey: "studio.assetDerivation.targetKind.title",
  hintKey: "studio.assetDerivation.targetKind.hint",
  options: [
    { id: "character", labelKey: "studio.assetDerivation.targetKind.character", emoji: "🧑" },
    { id: "prop", labelKey: "studio.assetDerivation.targetKind.prop", emoji: "📦" },
    { id: "location", labelKey: "studio.assetDerivation.targetKind.location", emoji: "🏡" },
  ],
};

export const CHARACTER_DERIVATION_TRANSFORMS: WizardChoiceStepDef = {
  id: "derivation_transform",
  titleKey: "studio.assetDerivation.transform.character.title",
  hintKey: "studio.assetDerivation.transform.character.hint",
  options: opts([
    { id: "chef", labelKey: "character.chef", emoji: "👨‍🍳" },
    { id: "garden", labelKey: "character.garden", emoji: "🌿" },
    { id: "designer", labelKey: "character.designer", emoji: "✏️" },
    { id: "community", labelKey: "character.community", emoji: "🤝" },
    { id: "mascot", labelKey: "character.mascot", emoji: "🎭" },
    { id: "custom", labelKey: "common.custom", emoji: "✨" },
  ]),
  allowsCustom: true,
};

export const PROP_DERIVATION_TRANSFORMS: WizardChoiceStepDef = {
  id: "derivation_transform",
  titleKey: "studio.assetDerivation.transform.prop.title",
  hintKey: "studio.assetDerivation.transform.prop.hint",
  options: opts([
    { id: "variant", labelKey: "prop.variant", emoji: "🔁" },
    { id: "seasonal", labelKey: "prop.seasonal", emoji: "🍂" },
    { id: "premium", labelKey: "prop.premium", emoji: "💎" },
    { id: "branded", labelKey: "prop.branded", emoji: "🏷️" },
    { id: "custom", labelKey: "common.custom", emoji: "✨" },
  ]),
  allowsCustom: true,
};

export const LOCATION_DERIVATION_TRANSFORMS: WizardChoiceStepDef = {
  id: "derivation_transform",
  titleKey: "studio.assetDerivation.transform.location.title",
  hintKey: "studio.assetDerivation.transform.location.hint",
  options: opts([
    { id: "variant", labelKey: "location.variant", emoji: "🔁" },
    { id: "region", labelKey: "location.region", emoji: "🌍" },
    { id: "time_of_day", labelKey: "location.timeOfDay", emoji: "🌅" },
    { id: "mood", labelKey: "location.mood", emoji: "✨" },
    { id: "custom", labelKey: "common.custom", emoji: "✨" },
  ]),
  allowsCustom: true,
};

export function derivationTransformDefForKind(kind: StudioAssetKind): WizardChoiceStepDef | null {
  if (kind === "character") {
    return CHARACTER_DERIVATION_TRANSFORMS;
  }
  if (kind === "prop") {
    return PROP_DERIVATION_TRANSFORMS;
  }
  if (kind === "location") {
    return LOCATION_DERIVATION_TRANSFORMS;
  }
  return null;
}

export function transformLabelForChoice(
  kind: StudioAssetKind,
  choiceId: string,
  customText: string,
  labels: Record<string, string>
): string {
  if (choiceId === "custom" && customText.trim()) {
    return customText.trim();
  }
  const prefix =
    kind === "character" ? "character."
    : kind === "prop" ? "prop."
    : "location.";
  return labels[`${prefix}${choiceId}`] ?? choiceId.replace(/_/g, " ");
}
