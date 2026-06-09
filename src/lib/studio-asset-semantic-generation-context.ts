import type { AssetStyleDna } from "@/types/studio-asset-derivation";
import type { AssetWizardDraft } from "@/lib/studio-asset-wizard-draft";
import { buildConstructionContinuityPromptBlock } from "@/lib/studio-asset-animation-readiness";
import { buildCharacterStylePromptBlock } from "@/lib/studio-asset-character-style-cards";
import { buildCompositionGraphPromptBlock } from "@/lib/studio-asset-composition-graph";
import { buildCanonicalEvolutionPromptBlock } from "@/lib/studio-asset-character-evolution";
import { buildDynamicAccessoriesPromptBlock } from "@/lib/studio-asset-dynamic-accessories";
import { buildPlacementPromptBlock } from "@/lib/studio-asset-reference-placement";
import { buildIdentityShapeMarkersPromptLine } from "@/lib/studio-asset-identity-shape-markers";
import type { CanonicalEvolutionConstruction } from "@/types/studio-asset-character-evolution";
import { buildAssetSemanticRecordFromWizardDraft } from "@/lib/studio-asset-semantic-record";
import type { AssetSemanticRecord } from "@/types/studio-asset-semantic-record";
import type { AssetVisionAnalysis } from "@/types/studio-asset-vision-analysis";

export type AssetSemanticGenerationInput = {
  summaryPrompt?: string;
  userInstruction?: string;
  preserveRules?: string;
  changeRules?: string;
  forbiddenRules?: string;
  semanticRecord?: AssetSemanticRecord | null;
  visionAnalysis?: AssetVisionAnalysis | null;
  styleDna?: AssetStyleDna | null;
  canonicalEvolutionConstruction?: CanonicalEvolutionConstruction;
};

function joinRules(rules: string[] | string | undefined): string {
  if (!rules) {
    return "";
  }
  if (Array.isArray(rules)) {
    return rules.join(", ");
  }
  return rules.trim();
}

/** Single deduplicated semantic block for all asset reference generation paths. */
export function buildAssetSemanticGenerationContext(input: AssetSemanticGenerationInput): string {
  const record = input.semanticRecord;
  const vision = input.visionAnalysis;
  const styleDna = input.styleDna;

  const objectType = record?.objectType ?? vision?.objectTypeLabel;
  const visualStyle = record?.visualStyle ?? vision?.visualStyle ?? styleDna?.visualStyle;
  const brandIdentity = record?.brandIdentity ?? vision?.brandIdentity ?? styleDna?.brandIdentity;
  const shapeDna =
    record?.shapeDna?.join(", ") ??
    vision?.shapeLanguage.join(", ") ??
    styleDna?.shapeLanguage;
  const keyFeatures = record?.keyFeatures?.join(", ") ?? vision?.keyFeatures.join(", ");
  const colors =
    record?.primaryColors?.map((c) => (c.hex ? `${c.label} ${c.hex}` : c.label)).join(", ") ??
    vision?.colors.map((c) => (c.hex ? `${c.label} ${c.hex}` : c.label)).join(", ") ??
    styleDna?.colorTheme;

  const preserve =
    joinRules(input.preserveRules) ||
    joinRules(record?.preserveRules) ||
    joinRules(vision?.suggestedPreserve);
  const change =
    joinRules(input.changeRules) ||
    joinRules(record?.changeRules) ||
    joinRules(vision?.suggestedChange);
  const forbidden =
    joinRules(input.forbiddenRules) ||
    joinRules(record?.forbiddenRules) ||
    joinRules(vision?.suggestedForbidden);

  const lines = [
    objectType ? `Recognized as: ${objectType}.` : "",
    record?.assetFamily ? `Asset family: ${record.assetFamily}.` : "",
    visualStyle ? `Visual style: ${visualStyle}.` : "",
    brandIdentity ? `Brand identity: ${brandIdentity}.` : "",
    shapeDna ? `Shape DNA: ${shapeDna}.` : "",
    colors ? `Brand colors: ${colors}.` : "",
    keyFeatures ? `Key features: ${keyFeatures}.` : "",
    record?.identityFingerprint
      ? `Identity fingerprint: ${[
          record.identityFingerprint.faceStructure,
          record.identityFingerprint.outlineStyle,
          record.identityFingerprint.silhouette,
        ]
          .filter(Boolean)
          .join(", ")}.`
      : "",
    record?.identityAssetType ? `Asset type: ${record.identityAssetType}.` : "",
    record?.identityProfile ? `Identity profile: ${record.identityProfile}.` : "",
    record?.identityImportance ? `Identity importance: ${record.identityImportance}.` : "",
    typeof record?.animationReadinessScore === "number"
      ? `Animation readiness: ${record.animationReadinessScore}%.`
      : "",
    buildConstructionContinuityPromptBlock(record?.characterConstructionProfile),
    buildIdentityShapeMarkersPromptLine(record?.identityFingerprint),
    record?.worldContext ? `World context: ${record.worldContext}.` : "",
    record?.roleContext ? `Role context: ${record.roleContext}.` : "",
    preserve ? `Preserve: ${preserve}.` : "",
    change ? `Change: ${change}.` : "",
    forbidden ? `Forbidden: ${forbidden}.` : "",
    styleDna?.mascotTraits ? `Character traits: ${styleDna.mascotTraits}.` : "",
    styleDna?.outfitHints ? `Outfit hints: ${styleDna.outfitHints}.` : "",
    input.canonicalEvolutionConstruction
      ? buildCanonicalEvolutionPromptBlock(input.canonicalEvolutionConstruction)
      : record?.identityAssetType === "canonical_character_base"
        ? "Canonical Character Base: neutral animation-ready character without profession, tools, or campaign elements."
        : "",
    record?.characterStyleCard
      ? buildCharacterStylePromptBlock(
          record.characterStyleCard as import("@/types/studio-asset-generation-workbench").CharacterStyleCardId,
          record.characterStyleCustom
        )
      : "",
    record?.dynamicAccessories?.length
      ? buildDynamicAccessoriesPromptBlock(record.dynamicAccessories)
      : "",
    record?.referencePlacements?.length
      ? buildPlacementPromptBlock(record.referencePlacements)
      : "",
    record?.referencePlacements?.length ? buildCompositionGraphPromptBlockFromRecord(record) : "",
  ].filter(Boolean);

  return lines.join(" ");
}

function buildCompositionGraphPromptBlockFromRecord(
  record: import("@/types/studio-asset-semantic-record").AssetSemanticRecord
): string {
  if (!record.referencePlacements?.length) {
    return "";
  }
  const draftLike = {
    referencePlacements: record.referencePlacements,
    sourceReferenceName: record.sourceReferenceName ?? "",
    name: record.sourceReferenceName ?? "",
    semanticLayers: record.semanticLayers ?? [],
  } as import("@/lib/studio-asset-wizard-draft").AssetWizardDraft;
  return buildCompositionGraphPromptBlock(draftLike);
}

export function buildAssetSemanticGenerationInputFromDraft(
  draft: AssetWizardDraft
): AssetSemanticGenerationInput {
  return {
    semanticRecord: buildAssetSemanticRecordFromWizardDraft(draft),
    visionAnalysis: draft.sourceVisionAnalysis,
    styleDna: draft.derivationStyleDna,
    preserveRules: draft.sourceTransformPreserve,
    changeRules: draft.sourceTransformChange,
    forbiddenRules: draft.sourceTransformForbidden,
    userInstruction: draft.sourceTransformInstruction,
    canonicalEvolutionConstruction:
      draft.characterEvolutionChoice === "canonical_character_base"
        ? draft.canonicalEvolutionConstruction
        : undefined,
  };
}

export function buildAssetSemanticRulesPromptBlock(input: AssetSemanticGenerationInput): string {
  const context = buildAssetSemanticGenerationContext(input);
  const instruction = input.userInstruction?.trim();
  const parts = [context, instruction ? `User instruction: ${instruction}` : ""].filter(Boolean);
  return parts.join(" ");
}
