import type { CharacterReferenceImageAnalysis } from "@/types/studio-character-identity-image-prefill";
import type { AssetDerivationPreview, AssetStyleDna } from "@/types/studio-asset-derivation";
import type { StudioAssetKind } from "@/types/studio-asset-creation";

export function mapAnalysisToStyleDna(analysis: CharacterReferenceImageAnalysis): AssetStyleDna {
  return {
    visualStyle: analysis.visualStyle?.trim() ?? "",
    colorTheme: [analysis.colorTheme, analysis.colorNotes].filter(Boolean).join("; ").trim(),
    shapeLanguage: analysis.shapeLanguage?.trim() ?? "",
    outfitHints: [analysis.clothing, analysis.accessories].filter(Boolean).join("; ").trim(),
    brandIdentity: analysis.appearanceMemory?.trim() ?? "",
    mascotTraits: [analysis.personality, analysis.energy, analysis.role]
      .filter(Boolean)
      .join("; ")
      .trim(),
    confidence: typeof analysis.confidence === "number" ? analysis.confidence : 0.5,
  };
}

export function emptyStyleDna(): AssetStyleDna {
  return {
    visualStyle: "",
    colorTheme: "",
    shapeLanguage: "",
    outfitHints: "",
    brandIdentity: "",
    mascotTraits: "",
    confidence: 0,
  };
}

export function buildDerivationSummaryPrompt(params: {
  targetKind: StudioAssetKind;
  sourceName: string;
  transformLabel: string;
  styleDna: AssetStyleDna;
}): string {
  const { targetKind, sourceName, transformLabel, styleDna } = params;
  const dnaLines = [
    styleDna.visualStyle ? `Visual style: ${styleDna.visualStyle}.` : "",
    styleDna.colorTheme ? `Color theme: ${styleDna.colorTheme}.` : "",
    styleDna.shapeLanguage ? `Shape language: ${styleDna.shapeLanguage}.` : "",
    styleDna.brandIdentity ? `Brand identity: ${styleDna.brandIdentity}.` : "",
    styleDna.mascotTraits ? `Mascot traits: ${styleDna.mascotTraits}.` : "",
  ].filter(Boolean);

  const kindNoun =
    targetKind === "character" ? "character"
    : targetKind === "prop" ? "prop"
    : targetKind === "location" ? "location"
    : "asset";

  return [
    `Derived ${kindNoun} based on "${sourceName}".`,
    `Transformation: ${transformLabel}.`,
    "Preserve the source brand style, colors, and mascot identity.",
    ...dnaLines,
  ]
    .filter(Boolean)
    .join(" ");
}

export function buildDerivationPreview(params: {
  sourceName: string;
  targetKind: StudioAssetKind;
  transformLabel: string;
  styleDna: AssetStyleDna;
  preserveLabels: Record<string, string>;
  changeLabels: Record<string, string>;
}): AssetDerivationPreview {
  const { sourceName, targetKind, transformLabel, styleDna, preserveLabels, changeLabels } = params;

  const preserves: string[] = [];
  if (styleDna.colorTheme) {
    preserves.push(preserveLabels.colors ?? "Colors");
  }
  if (styleDna.shapeLanguage || styleDna.visualStyle) {
    preserves.push(preserveLabels.shape ?? "Shape language");
  }
  if (styleDna.brandIdentity || styleDna.mascotTraits) {
    preserves.push(preserveLabels.brand ?? "Brand identity");
  }
  if (preserves.length === 0) {
    preserves.push(preserveLabels.style ?? "Visual style");
  }

  const changes: string[] = [];
  if (targetKind === "character") {
    changes.push(changeLabels.role ?? "Role / outfit");
    changes.push(changeLabels.accessories ?? "Accessories");
  } else if (targetKind === "prop") {
    changes.push(changeLabels.variant ?? "Variant / finish");
  } else if (targetKind === "location") {
    changes.push(changeLabels.mood ?? "Mood / lighting");
  }
  changes.push(`${changeLabels.transformation ?? "Transformation"}: ${transformLabel}`);

  const targetLabel =
    targetKind === "character" ? `${transformLabel} mascot`
    : targetKind === "prop" ? `${transformLabel} prop`
    : `${transformLabel} location`;

  return {
    sourceLabel: sourceName,
    targetLabel,
    preserves,
    changes,
  };
}

export function applyDerivationTransformToChoices(
  targetKind: StudioAssetKind,
  transformChoice: string,
  customText: string
): Record<string, string> {
  if (targetKind === "character") {
    const choices: Record<string, string> = { character_type: transformChoice };
    if (transformChoice === "chef") {
      choices.character_outfit = "chef";
    } else if (transformChoice === "garden") {
      choices.character_outfit = "casual";
      choices.character_world = "garden";
    } else if (transformChoice === "designer") {
      choices.character_outfit = "smart_casual";
    } else if (transformChoice === "community") {
      choices.character_personality = "friendly";
    } else if (transformChoice === "mascot") {
      choices.character_type = "mascot";
    }
    return choices;
  }
  if (targetKind === "prop") {
    const map: Record<string, string> = {
      variant: "product",
      seasonal: "seasonal",
      premium: "luxury",
      branded: "brand_asset",
    };
    return { prop_category: map[transformChoice] ?? "brand_asset", prop_style: transformChoice };
  }
  if (targetKind === "location") {
    const map: Record<string, string> = {
      variant: "garden",
      region: "outdoor",
      time_of_day: "golden_hour",
      mood: "cozy",
    };
    return {
      location_type: map[transformChoice] ?? "garden",
      location_mood: transformChoice === "mood" ? "cozy" : transformChoice,
      location_lighting: transformChoice === "time_of_day" ? "golden_hour" : "natural",
    };
  }
  return {};
}

export function applyDerivationTransformCustomTexts(
  transformChoice: string,
  customText: string
): Record<string, string> {
  if (transformChoice !== "custom" || !customText.trim()) {
    return {};
  }
  return { derivation_transform: customText.trim() };
}

/** Estimated minutes saved vs manual recreation from scratch. */
export const DERIVATION_TIME_SAVED_MINUTES = 10;
