import {
  buildAssetSemanticGenerationInputFromDraft,
  buildAssetSemanticGenerationContext,
} from "@/lib/studio-asset-semantic-generation-context";
import {
  buildSourceImageFidelityBlock,
  buildVariantTransformationPromptBlock,
  formatIdentityFingerprintSummary,
} from "@/lib/studio-asset-identity-preservation";
import type { AssetWizardDraft } from "@/lib/studio-asset-wizard-draft";
import { resolveWizardSourceReference } from "@/lib/studio-asset-wizard-source-reference";
import { resolveTransformLabelForGeneration } from "@/lib/studio-asset-wizard-source-flow";

export const TRANSFORM_PRESERVE_CHIP_IDS = [
  "style",
  "colors",
  "face",
  "shape",
  "brand",
  "pose",
  "accessories",
] as const;

export const TRANSFORM_CHANGE_CHIP_IDS = [
  "role",
  "outfit",
  "accessories",
  "context",
  "background",
  "expression",
] as const;

export type TransformPreserveChipId = (typeof TRANSFORM_PRESERVE_CHIP_IDS)[number];
export type TransformChangeChipId = (typeof TRANSFORM_CHANGE_CHIP_IDS)[number];

const DEFAULT_PRESERVE_EN =
  "style, colors, face shape, brand identity, overall shape language";
const DEFAULT_CHANGE_EN = "role, outfit, props, and context as described";

export type TransformPromptPreview = {
  sourceName: string;
  variantLabel: string;
  preserve: string;
  change: string;
  forbidden: string;
  instruction: string;
  compactPrompt: string;
  brandIdentity: string;
  assetFamily: string;
  identityFingerprintSummary: string;
};

export function defaultTransformPreserveText(): string {
  return DEFAULT_PRESERVE_EN;
}

export function resolveVariantLabelForDraft(draft: AssetWizardDraft): string {
  return resolveTransformLabelForGeneration(draft)?.trim() || "";
}

export function buildTransformPromptPreview(draft: AssetWizardDraft): TransformPromptPreview {
  const source = resolveWizardSourceReference(draft);
  const sourceName = source?.sourceReferenceName ?? "source image";
  const variantLabel = resolveVariantLabelForDraft(draft) || "variant";
  const instruction = draft.sourceTransformInstruction.trim();
  const preserve = draft.sourceTransformPreserve.trim() || defaultTransformPreserveText();
  const change = draft.sourceTransformChange.trim() || variantLabel;
  const forbidden = draft.sourceTransformForbidden.trim();
  const compactPrompt = buildSourceTransformSummaryPrompt(draft);
  const vision = draft.sourceVisionAnalysis;

  return {
    sourceName,
    variantLabel,
    preserve,
    change,
    forbidden,
    instruction,
    compactPrompt,
    brandIdentity: vision?.brandIdentity ?? "",
    assetFamily: vision?.assetFamily ?? "",
    identityFingerprintSummary: vision
      ? formatIdentityFingerprintSummary(vision.identityFingerprint)
      : "",
  };
}

export function buildSourceTransformSummaryPrompt(draft: AssetWizardDraft): string {
  const preview = buildTransformPromptPreviewFields(draft);
  const sourceName = preview.sourceName;
  const vision = draft.sourceVisionAnalysis;
  const variantLabel = preview.variantLabel;
  const contextBlock = buildAssetSemanticGenerationContext(
    buildAssetSemanticGenerationInputFromDraft(draft)
  );

  const variantBlock = buildVariantTransformationPromptBlock({
    sourceName,
    variantLabel,
    brandIdentity: vision?.brandIdentity,
    assetFamily: vision?.assetFamily,
  });
  const fidelityBlock = buildSourceImageFidelityBlock(sourceName);

  const lines = [
    fidelityBlock,
    variantBlock,
    contextBlock,
    vision?.identityFingerprint
      ? `Identity fingerprint: ${formatIdentityFingerprintSummary(vision.identityFingerprint)}.`
      : "",
  ].filter(Boolean);

  if (preview.instruction) {
    lines.push(`User instruction: ${preview.instruction}`);
  }

  lines.push(`Preserve: ${preview.preserve}.`);
  lines.push(`Change: ${preview.change}.`);

  const forbidden =
    preview.forbidden ||
    formatForbiddenFromVision(draft) ||
    "style break, color break, redesign from scratch";
  lines.push(`Forbidden: ${forbidden}.`);

  return lines.join(" ");
}

function formatForbiddenFromVision(draft: AssetWizardDraft): string {
  const forbidden = draft.sourceVisionAnalysis?.suggestedForbidden ?? [];
  return forbidden.length ? forbidden.join(", ") : "";
}

function buildTransformPromptPreviewFields(draft: AssetWizardDraft) {
  const source = resolveWizardSourceReference(draft);
  return {
    sourceName: source?.sourceReferenceName ?? "source image",
    variantLabel: resolveVariantLabelForDraft(draft) || "variant",
    instruction: draft.sourceTransformInstruction.trim(),
    preserve: draft.sourceTransformPreserve.trim() || defaultTransformPreserveText(),
    change: draft.sourceTransformChange.trim() || resolveVariantLabelForDraft(draft) || "role and context",
    forbidden: draft.sourceTransformForbidden.trim(),
  };
}

/** Combined user instruction for API sourceReference.userPrompt. */
export function buildSourceTransformUserPrompt(draft: AssetWizardDraft): string {
  const preview = buildTransformPromptPreviewFields(draft);
  const parts: string[] = [];

  if (preview.instruction) {
    parts.push(preview.instruction);
  }
  if (preview.preserve) {
    parts.push(`Preserve: ${preview.preserve}.`);
  }
  if (preview.change) {
    parts.push(`Change: ${preview.change}.`);
  }
  const forbidden = preview.forbidden || formatForbiddenFromVision(draft);
  if (forbidden) {
    parts.push(`Forbidden: ${forbidden}.`);
  }

  return parts.join(" ").trim();
}

export function syncTransformPromptDraft(draft: AssetWizardDraft): Partial<AssetWizardDraft> {
  return {
    summaryPrompt: buildSourceTransformSummaryPrompt(draft),
  };
}

export function shouldShowTransformPromptStep(draft: AssetWizardDraft): boolean {
  return Boolean(resolveWizardSourceReference(draft));
}

export function canAdvanceFromTransformPromptStep(draft: AssetWizardDraft): boolean {
  if (!shouldShowTransformPromptStep(draft)) {
    return true;
  }
  return (
    draft.referenceGenerationStatus === "preview" ||
    draft.referenceGenerationStatus === "accepted"
  );
}

export function toggleChipInText(current: string, label: string, active: boolean): string {
  const parts = current
    .split(/[,;]+/)
    .map((p) => p.trim())
    .filter(Boolean);
  const normalized = label.trim().toLowerCase();
  const exists = parts.some((p) => p.toLowerCase() === normalized);
  if (active && !exists) {
    parts.push(label);
  }
  if (!active && exists) {
    return parts.filter((p) => p.toLowerCase() !== normalized).join(", ");
  }
  return parts.join(", ");
}

export function chipActiveInText(text: string, label: string): boolean {
  return text
    .split(/[,;]+/)
    .map((p) => p.trim().toLowerCase())
    .includes(label.trim().toLowerCase());
}
