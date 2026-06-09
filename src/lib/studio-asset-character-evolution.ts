import { seedDynamicAccessoriesFromDraft } from "@/lib/studio-asset-dynamic-accessories";
import { extractAssetSemanticRecordFromCharacter } from "@/lib/studio-asset-semantic-record";
import { isBrandMascotVision } from "@/lib/studio-asset-identity-profile";
import type { AssetWizardDraft } from "@/lib/studio-asset-wizard-draft";
import { hasWizardSourceReference } from "@/lib/studio-asset-wizard-source-reference";
import {
  buildIdentityProfileRules,
  rulesToCommaSeparated,
} from "@/lib/studio-asset-identity-profile";
import {
  CHARACTER_EVOLUTION_CHOICES,
  DEFAULT_CANONICAL_EVOLUTION_CONSTRUCTION,
  type CanonicalEvolutionConstruction,
  type CharacterEvolutionChoice,
} from "@/types/studio-asset-character-evolution";
import type { IdentityAssetType } from "@/types/studio-asset-identity-profile";
import type { StudioAsset } from "@/types/studio-media-asset";
import type { StudioCharacterListItem } from "@/types/studio-api";
import type { AssetSemanticRecord } from "@/types/studio-asset-semantic-record";

export const CANONICAL_CHARACTER_BASE_ASSET_TYPE = "canonical_character_base" as const;
export const CANONICAL_EVOLUTION_PROFILE = "canonical_evolution" as const;

export function isCanonicalCharacterBaseRecord(
  record: Pick<AssetSemanticRecord, "identityAssetType"> | null | undefined
): boolean {
  return record?.identityAssetType === CANONICAL_CHARACTER_BASE_ASSET_TYPE;
}

export function qualifiesForCharacterEvolution(draft: AssetWizardDraft): boolean {
  const kind = draft.derivationTargetKind ?? draft.kind;
  if (kind !== "character") {
    return false;
  }
  if (!hasWizardSourceReference(draft)) {
    return false;
  }

  const assetType = draft.identityAssetType;
  const profile = draft.identityProfileLevel;
  const vision = draft.sourceVisionAnalysis;

  if (assetType === "mascot" || assetType === "logo") {
    return true;
  }
  if (profile === "master_character" || profile === "canonical_evolution") {
    return true;
  }
  if (vision && isBrandMascotVision(vision)) {
    return true;
  }

  return false;
}

export function isCanonicalEvolutionFlow(draft: AssetWizardDraft): boolean {
  return draft.characterEvolutionChoice === "canonical_character_base";
}

export function isAnimationReadyEvolutionFlow(draft: AssetWizardDraft): boolean {
  return draft.characterEvolutionChoice === "animation_ready_character";
}

export function isVariantEvolutionFlow(draft: AssetWizardDraft): boolean {
  return !draft.characterEvolutionChoice || draft.characterEvolutionChoice === "variant";
}

export function shouldShowCharacterEvolutionStep(draft: AssetWizardDraft): boolean {
  return qualifiesForCharacterEvolution(draft) && Boolean(draft.sourceVisionAnalysis);
}

export function shouldShowCanonicalEvolutionConstructionStep(draft: AssetWizardDraft): boolean {
  return isCanonicalEvolutionFlow(draft) && Boolean(draft.sourceVisionAnalysis);
}

export function canAdvanceFromCharacterEvolutionStep(draft: AssetWizardDraft): boolean {
  return CHARACTER_EVOLUTION_CHOICES.includes(
    draft.characterEvolutionChoice as CharacterEvolutionChoice
  );
}

export function canAdvanceFromCanonicalEvolutionConstructionStep(
  draft: AssetWizardDraft
): boolean {
  const c = draft.canonicalEvolutionConstruction;
  return Boolean(c.eyes && c.mouth && c.expressions && c.bodyConstruction && c.posture && c.build);
}

export function applyCharacterEvolutionChoice(
  draft: AssetWizardDraft,
  choice: CharacterEvolutionChoice
): Partial<AssetWizardDraft> {
  if (choice === "canonical_character_base") {
    const rules = buildIdentityProfileRules({
      assetType: CANONICAL_CHARACTER_BASE_ASSET_TYPE as IdentityAssetType,
      profileLevel: CANONICAL_EVOLUTION_PROFILE,
      vision: draft.sourceVisionAnalysis,
    });
    const text = rulesToCommaSeparated(rules);
    const construction = {
      ...DEFAULT_CANONICAL_EVOLUTION_CONSTRUCTION,
      ...draft.canonicalEvolutionConstruction,
    };
    const summaryPrompt = buildCanonicalEvolutionSummaryPrompt(construction, draft.name);

    return {
      characterEvolutionChoice: choice,
      dynamicAccessories: seedDynamicAccessoriesFromDraft(draft),
      identityAssetType: CANONICAL_CHARACTER_BASE_ASSET_TYPE as IdentityAssetType,
      identityProfileLevel: CANONICAL_EVOLUTION_PROFILE,
      identityProfileConfirmed: true,
      canonicalEvolutionConstruction: construction,
      sourceTransformChoice: "canonical_character_base",
      sourceTransformCustom: "",
      sourceTransformPreserve: text.preserve,
      sourceTransformChange: text.change,
      sourceTransformForbidden: text.forbidden,
      sourceTransformInstruction: summaryPrompt,
      summaryPrompt,
      referenceMode: "generate",
      characterConstruction: {
        bodyVisibility: "full_body",
        requiresConstruction: true,
        preserveSilhouette: true,
        preserveHeadShape: true,
        preserveProportions: true,
        standardPose: "neutral_stance",
        bodyType: construction.build,
        postureProfile: construction.posture,
      },
      animationPreparationActions: [
        "remove_background",
        "transparent_png",
        "reconstruct_full_body",
        "standard_pose",
        "expression_base",
        "animation_ready_reference",
      ],
    };
  }

  if (choice === "animation_ready_character") {
    return {
      characterEvolutionChoice: choice,
      referenceMode: "upload",
    };
  }

  return {
    characterEvolutionChoice: choice,
    referenceMode: "generate",
  };
}

export function buildCanonicalEvolutionSummaryPrompt(
  construction: CanonicalEvolutionConstruction,
  name?: string
): string {
  const stripLabels: string[] = [];
  if (construction.stripAccessories.globe) {
    stripLabels.push("globe");
  }
  if (construction.stripAccessories.tools) {
    stripLabels.push("tools");
  }
  if (construction.stripAccessories.chefAttributes) {
    stripLabels.push("chef attributes");
  }
  if (construction.stripAccessories.gardenAttributes) {
    stripLabels.push("garden attributes");
  }

  const label = name?.trim() || "Canonical Character Base";

  return [
    `Create official Canonical Character Base: ${label}.`,
    "Neutral animation-ready character without profession, tools, accessories, or campaign elements.",
    "Full body, neutral stance, animation-ready expression, transparent background.",
    `Eyes: ${construction.eyes.replace(/_/g, " ")}.`,
    `Mouth: ${construction.mouth.replace(/_/g, " ")}.`,
    `Expressions: ${construction.expressions}.`,
    `Body: ${construction.bodyConstruction.replace(/_/g, " ")}.`,
    `Posture: ${construction.posture}.`,
    `Build: ${construction.build}.`,
    stripLabels.length ? `Remove role-specific items: ${stripLabels.join(", ")}.` : "",
    "Preserve brand identity, brand colors, face structure, silhouette, identity shape markers, head shape, family DNA, and fingerprint markers.",
    "May evolve eyes, mouth, hands, arms, expressions, animation suitability, clothing details, and body details for animation.",
    "Never change brand identity, shape markers, family recognition, or color DNA.",
  ]
    .filter(Boolean)
    .join(" ");
}

export function buildCanonicalEvolutionPromptBlock(
  construction: CanonicalEvolutionConstruction
): string {
  return buildCanonicalEvolutionSummaryPrompt(construction);
}

export function findCanonicalCharacterBaseForSource(
  characters: StudioCharacterListItem[],
  sourceAssetId: string
): StudioCharacterListItem | null {
  const normalized = sourceAssetId.trim();
  if (!normalized) {
    return null;
  }

  for (const character of characters) {
    const record = extractAssetSemanticRecordFromCharacter(character);
    if (!isCanonicalCharacterBaseRecord(record)) {
      continue;
    }
    const parentId = record.derivedFromAssetId ?? record.parentAssetId;
    if (parentId === normalized) {
      return character;
    }
  }

  return null;
}

export function resolvePreferredCharacterDerivationSource(
  characters: StudioCharacterListItem[],
  sourceAssetId: string | null | undefined
): StudioCharacterListItem | null {
  const normalized = sourceAssetId?.trim();
  if (!normalized) {
    return null;
  }

  const canonicalBase = findCanonicalCharacterBaseForSource(characters, normalized);
  if (canonicalBase) {
    return canonicalBase;
  }

  return characters.find((c) => c.id === normalized) ?? null;
}

export function scoreMotionCharacterReferencePreference(
  record: Pick<AssetSemanticRecord, "identityAssetType" | "identityProfile">
): number {
  if (record.identityAssetType === CANONICAL_CHARACTER_BASE_ASSET_TYPE) {
    return 30;
  }
  if (record.identityProfile === "master_character") {
    return 20;
  }
  return 0;
}

export function listDerivedCharacterRoleVariants(
  assets: StudioAsset[],
  parentAssetId: string
): StudioAsset[] {
  const normalized = parentAssetId.trim();
  if (!normalized) {
    return [];
  }

  return assets.filter((asset) => {
    if (asset.category !== "character") {
      return false;
    }
    if (isCanonicalCharacterBaseRecord({ identityAssetType: asset.semanticContinuity?.identityAssetType })) {
      return false;
    }
    const derivedFrom = asset.semanticContinuity?.derivedFromAssetId;
    return derivedFrom === normalized;
  });
}

export function findCanonicalBaseSourceAsset(
  assets: StudioAsset[],
  asset: StudioAsset
): StudioAsset | null {
  const derivedFromId = asset.semanticContinuity?.derivedFromAssetId;
  if (!derivedFromId) {
    return null;
  }
  return assets.find((a) => a.id === derivedFromId) ?? null;
}
