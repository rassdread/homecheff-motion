/**
 * Part-specific dynamic actions for Assistant V3.5 editor mode.
 */

import type { AssistantV3ActionGroup, AssistantV3AssetContext, AssistantV3PartContext } from "@/types/assistant-v3";

function nl(locale: "nl" | "en", nlText: string, enText: string): string {
  return locale === "en" ? enText : nlText;
}

function action(
  id: string,
  label: string,
  promptMessage: string
): { id: string; label: string; promptMessage: string } {
  return { id, label, promptMessage };
}

function eyesActions(part: AssistantV3PartContext, locale: "nl" | "en"): AssistantV3ActionGroup {
  const target = part.partName;
  const asset = part.assetName;
  return {
    id: "part_eyes",
    label: target,
    actions: [
      action("bigger", nl(locale, "Groter", "Bigger"), `Maak ${target} van ${asset} groter`),
      action("smaller", nl(locale, "Kleiner", "Smaller"), `Maak ${target} van ${asset} kleiner`),
      action("color", nl(locale, "Andere kleur", "Different color"), `Verander de kleur van ${target} van ${asset}`),
      action("friendlier", nl(locale, "Vriendelijker", "Friendlier"), `Maak ${target} van ${asset} vriendelijker`),
      action("cartoon", nl(locale, "Cartoonstijl", "Cartoon style"), `Maak ${target} van ${asset} cartoon`),
    ],
  };
}

function outfitActions(part: AssistantV3PartContext, locale: "nl" | "en"): AssistantV3ActionGroup {
  const asset = part.assetName;
  return {
    id: "part_outfit",
    label: part.partName,
    actions: [
      action("business", nl(locale, "Zakelijk", "Business"), `Maak de outfit van ${asset} zakelijker`),
      action("casual", nl(locale, "Casual", "Casual"), `Maak de outfit van ${asset} casual`),
      action("chef", nl(locale, "Chef", "Chef"), `Geef ${asset} een chef-outfit`),
      action("garden", nl(locale, "Garden", "Garden"), `Geef ${asset} een garden-outfit`),
      action("designer", nl(locale, "Designer", "Designer"), `Geef ${asset} een designer-outfit`),
    ],
  };
}

function furActions(part: AssistantV3PartContext, locale: "nl" | "en"): AssistantV3ActionGroup {
  const asset = part.assetName;
  return {
    id: "part_fur",
    label: part.partName,
    actions: [
      action("color", nl(locale, "Kleur aanpassen", "Adjust color"), `Pas de vachtkleur van ${asset} aan`),
      action("pattern", nl(locale, "Patroon aanpassen", "Adjust pattern"), `Pas het vachtpatroon van ${asset} aan`),
      action("softer", nl(locale, "Zachter", "Softer"), `Maak de vacht van ${asset} zachter`),
      action("cartoon", nl(locale, "Cartoonstijl", "Cartoon style"), `Maak de vacht van ${asset} cartoon`),
    ],
  };
}

function mouthActions(part: AssistantV3PartContext, locale: "nl" | "en"): AssistantV3ActionGroup {
  const target = part.partName;
  const asset = part.assetName;
  return {
    id: "part_mouth",
    label: target,
    actions: [
      action("smile", nl(locale, "Meer glimlach", "More smile"), `Geef ${target} van ${asset} een glimlach`),
      action("serious", nl(locale, "Serieuzer", "More serious"), `Maak ${target} van ${asset} serieuzer`),
      action("open", nl(locale, "Open mond", "Open mouth"), `Open ${target} van ${asset} iets meer`),
    ],
  };
}

function genericPartActions(part: AssistantV3PartContext, locale: "nl" | "en"): AssistantV3ActionGroup {
  return {
    id: `part_${part.partGroup}`,
    label: part.partName,
    actions: [
      action(
        "adjust",
        nl(locale, "Aanpassen", "Adjust"),
        `Pas ${part.partName} van ${part.assetName} aan`
      ),
      action(
        "refine",
        nl(locale, "Verfijnen", "Refine"),
        `Verfijn ${part.partName} van ${part.assetName}`
      ),
      action(
        "preserve",
        nl(locale, "Behouden", "Preserve"),
        `Behoud ${part.partName} van ${part.assetName} en pas de rest aan`
      ),
    ],
  };
}

export function buildPartSpecificActionGroups(
  part: AssistantV3PartContext | null,
  asset: AssistantV3AssetContext,
  locale: "nl" | "en"
): AssistantV3ActionGroup[] {
  if (!part?.partName) {
    return [];
  }

  const group = part.partGroup.toLowerCase();
  const label = part.partName.toLowerCase();

  if (group === "eyes" || /eye|ogen/.test(label)) {
    return [eyesActions(part, locale)];
  }
  if (group === "outfit" || group === "clothing" || /outfit|jacket|shirt/.test(label)) {
    return [outfitActions(part, locale)];
  }
  if (group === "coat" || /fur|vacht|feather|veren/.test(label)) {
    return [furActions(part, locale)];
  }
  if (group === "mouth" || /mouth|mond|lip/.test(label)) {
    return [mouthActions(part, locale)];
  }

  return [genericPartActions(part, locale)];
}
