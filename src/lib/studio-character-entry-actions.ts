import { updateStudioSceneApi } from "@/lib/studio-storyboards-client";
import {
  createStudioCharacterApi,
  fetchStudioCharacter,
} from "@/lib/studio-characters-client";
import { emptyAssetWizardDraft } from "@/lib/studio-asset-wizard-draft";
import { recordWizardSourceReference } from "@/lib/studio-asset-wizard-source-reference";
import type { BriefAssetRequirementKind } from "@/lib/studio-brief-asset-wizards";
import type { AssetWizardDraft } from "@/lib/studio-asset-wizard-draft";
import type { AssetVisionAnalysis, AssetVisionObjectType } from "@/types/studio-asset-vision-analysis";
import type { EnrichedCharacterConcept } from "@/lib/studio-character-wizard";

export type StudioCharacterExtractionMode = "exact" | "custom_variant" | "new_character";

export type StudioCharacterExtractionCustomization = {
  clothing: string;
  props: string;
  colors: string;
  style: string;
  age: string;
  gender: string;
  brandTraits: string;
};

export const EMPTY_CHARACTER_EXTRACTION_CUSTOMIZATION: StudioCharacterExtractionCustomization = {
  clothing: "",
  props: "",
  colors: "",
  style: "",
  age: "",
  gender: "",
  brandTraits: "",
};

export function isCharacterRequirementKind(kind: BriefAssetRequirementKind): boolean {
  return kind === "character" || kind === "mascot" || kind === "team";
}

const VISION_TYPE_LABELS_NL: Record<AssetVisionObjectType, string> = {
  character: "Persoon",
  mascot: "Mascotte",
  human: "Persoon",
  animal: "Dier",
  food_item: "Object",
  product: "Object",
  packaging: "Object",
  vehicle: "Object",
  tool: "Object",
  building: "Locatie",
  location: "Locatie",
  environment: "Omgeving",
  logo: "Logo",
  brand_asset: "Merk",
  illustration: "Illustratie",
  ui_asset: "Object",
  unknown: "Onbekend",
};

const VISION_TYPE_LABELS_EN: Record<AssetVisionObjectType, string> = {
  character: "Person",
  mascot: "Mascot",
  human: "Person",
  animal: "Animal",
  food_item: "Object",
  product: "Object",
  packaging: "Object",
  vehicle: "Object",
  tool: "Object",
  building: "Location",
  location: "Location",
  environment: "Environment",
  logo: "Logo",
  brand_asset: "Brand",
  illustration: "Illustration",
  ui_asset: "Object",
  unknown: "Unknown",
};

export function visionObjectTypeLabel(type: AssetVisionObjectType, locale: "nl" | "en"): string {
  return (locale === "nl" ? VISION_TYPE_LABELS_NL : VISION_TYPE_LABELS_EN)[type] ?? type;
}

export function buildCharacterExtractionDraft(input: {
  imageUrl: string;
  storageKey: string;
  fileName?: string;
  vision?: AssetVisionAnalysis | null;
  mode: StudioCharacterExtractionMode;
  customization: StudioCharacterExtractionCustomization;
  suggestedName?: string;
}): AssetWizardDraft {
  const source = recordWizardSourceReference({
    imageUrl: input.imageUrl,
    storageKey: input.storageKey,
    name: input.fileName,
  });
  const changeParts = [
    input.customization.clothing,
    input.customization.props,
    input.customization.colors,
    input.customization.style,
    input.customization.age,
    input.customization.gender,
    input.customization.brandTraits,
  ].filter(Boolean);

  const draft = emptyAssetWizardDraft("character", "derive_from_reference");
  const base = {
    ...draft,
    ...source,
    name: input.suggestedName?.trim() || input.vision?.objectTypeLabel || "Nieuw personage",
    description: input.vision?.keyFeatures?.join(", ") ?? "",
    summaryPrompt:
      input.mode === "new_character"
        ? `Create a new character inspired by the reference photo. ${changeParts.join(". ")}`
        : input.mode === "custom_variant"
          ? `Create a customized variant of the reference. Changes: ${changeParts.join(", ")}`
          : `Preserve the exact character identity from the reference photo.`,
    sourceTransformChange: changeParts.join("; "),
    sourceTransformPreserve:
      input.mode === "exact"
        ? (input.vision?.suggestedPreserve?.join(", ") ?? "face, colors, identity")
        : (input.vision?.suggestedPreserve?.join(", ") ?? ""),
    derivationFlow: true,
    sourceVisionAnalysis: input.vision ?? null,
    sourceVisionAnalysisStatus: (input.vision ? "ready" : "idle") as "ready" | "idle",
    choices: {
      ...(input.customization.style ? { style: input.customization.style } : {}),
      ...(input.customization.age ? { ageEnergy: input.customization.age } : {}),
      ...(input.customization.gender ? { presentation: input.customization.gender } : {}),
    },
    customTexts: {
      clothing: input.customization.clothing,
      props: input.customization.props,
      colors: input.customization.colors,
      brandTraits: input.customization.brandTraits,
    },
  };
  if (input.mode === "exact") {
    return {
      ...base,
      referenceImageUrl: input.imageUrl,
      referenceStorageKey: input.storageKey,
      referenceMode: "upload",
    };
  }
  return {
    ...base,
    referenceMode: "generate" as const,
  };
}

export async function attachCharacterToStoryboardScene(input: {
  storyboardId: string;
  sceneId: string;
  characterId: string;
  currentCharacterIds: string[];
}): Promise<boolean> {
  const nextIds = [...new Set([...input.currentCharacterIds, input.characterId])];
  const res = await updateStudioSceneApi(input.storyboardId, input.sceneId, {
    characterIds: nextIds,
  });
  return res.ok;
}

export async function duplicateStudioCharacter(characterId: string): Promise<
  | { ok: true; characterId: string }
  | { ok: false; error: string }
> {
  const detail = await fetchStudioCharacter(characterId);
  if (!detail.ok) {
    return { ok: false, error: "Character not found." };
  }
  const c = detail.data.character;
  const res = await createStudioCharacterApi({
    name: `${c.name} (kopie)`,
    role: c.role,
    description: c.description,
    personality: c.personality,
    referenceImageUrl: c.referenceImageUrl,
    referenceStorageKey: c.referenceStorageKey,
    appearanceMemory: c.appearanceMemory,
    personalityMemory: c.personalityMemory,
    continuityNotes: c.continuityNotes,
    defaultClothing: c.defaultClothing,
    defaultAccessories: c.defaultAccessories,
    visualKeywords: c.visualKeywords,
    identityStrength: c.identityStrength,
    continuityStrength: c.continuityStrength,
    worldProfileId: c.worldProfileId,
    voiceEnabled: false,
    voiceProvider: c.voiceProvider,
    voiceProfile: c.voiceProfile,
    voiceLanguage: c.voiceLanguage,
    referenceNotes: c.referenceNotes,
  });
  if (!res.ok) {
    return { ok: false, error: (res.data as { error?: string }).error ?? "Duplicate failed." };
  }
  return { ok: true, characterId: res.data.character.id };
}

export function buildDraftFromCharacterConcept(concept: EnrichedCharacterConcept): AssetWizardDraft {
  const draft = emptyAssetWizardDraft("character", "design");
  return {
    ...draft,
    name: concept.name,
    description: concept.personality,
    summaryPrompt: `Create a ${concept.type} character with ${concept.style} visual style, ${concept.presentation} presentation, ${concept.ageEnergy} energy, ${concept.coreTrait} core trait.`,
    referenceMode: "generate",
    choices: {
      type: concept.type,
      presentation: concept.presentation,
      ageEnergy: concept.ageEnergy,
      style: concept.style,
      coreTrait: concept.coreTrait,
    },
  };
}

export function characterVoiceStatusLabel(input: {
  voiceEnabled: boolean;
  voiceProfile: string;
  locale: "nl" | "en";
}): string {
  if (!input.voiceEnabled) {
    return input.locale === "nl" ? "Geen stem" : "No voice";
  }
  return input.voiceProfile?.trim() || (input.locale === "nl" ? "Stem gekoppeld" : "Voice linked");
}
