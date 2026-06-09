import type { AssetStyleDna } from "@/types/studio-asset-derivation";
import type { AssetWizardDraft } from "@/lib/studio-asset-wizard-draft";
import { buildConstructionContinuityPromptBlock } from "@/lib/studio-asset-animation-readiness";
import { buildIdentityShapeMarkersPromptLine } from "@/lib/studio-asset-identity-shape-markers";
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
  ].filter(Boolean);

  return lines.join(" ");
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
  };
}

export function buildAssetSemanticRulesPromptBlock(input: AssetSemanticGenerationInput): string {
  const context = buildAssetSemanticGenerationContext(input);
  const instruction = input.userInstruction?.trim();
  const parts = [context, instruction ? `User instruction: ${instruction}` : ""].filter(Boolean);
  return parts.join(" ");
}
