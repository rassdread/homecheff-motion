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
    const outfitMap: Record<string, string> = {
      chef: "chef",
      garden: "casual",
      designer: "smart_casual",
      host: "smart_casual",
      founder: "smart_casual",
      expert: "smart_casual",
      customer: "casual",
    };
    if (outfitMap[transformChoice]) {
      choices.character_outfit = outfitMap[transformChoice];
    }
    if (transformChoice === "garden") {
      choices.character_world = "garden";
    }
    if (transformChoice === "community" || transformChoice === "customer") {
      choices.character_personality = "friendly";
    }
    if (transformChoice === "mascot") {
      choices.character_type = "mascot";
    }
    if (transformChoice === "host") {
      choices.character_personality = "inspiring";
    }
    if (transformChoice === "narrator") {
      choices.character_type = "narrator";
    }
    if (transformChoice === "founder" || transformChoice === "expert") {
      choices.character_personality = "professional";
    }
    return choices;
  }
  if (targetKind === "prop") {
    const map: Record<string, string> = {
      product_variant: "product",
      packaging: "brand_asset",
      premium: "luxury",
      seasonal: "seasonal",
      branded: "brand_asset",
      variant: "product",
    };
    return {
      prop_category: map[transformChoice] ?? "brand_asset",
      prop_style: transformChoice === "premium" ? "premium" : "modern",
    };
  }
  if (targetKind === "location") {
    const typeMap: Record<string, string> = {
      day: "garden",
      night: "studio",
      premium: "market",
      local: "outdoor",
      cinematic: "market",
      variant: "garden",
      region: "outdoor",
      time_of_day: "garden",
      mood: "garden",
    };
    const lightingMap: Record<string, string> = {
      day: "natural",
      night: "dramatic",
      time_of_day: "golden_hour",
      cinematic: "dramatic",
    };
    const moodMap: Record<string, string> = {
      night: "cozy",
      mood: "cozy",
      cinematic: "inspiring",
    };
    return {
      location_type: typeMap[transformChoice] ?? "garden",
      location_mood: moodMap[transformChoice] ?? transformChoice,
      location_lighting: lightingMap[transformChoice] ?? "natural",
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
