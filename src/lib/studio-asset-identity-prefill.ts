/**
 * Universal asset identity prefill — single engine for prompt, image, and merge.
 * Asset-specific logic lives in adapters; no duplicate per-kind prefill systems.
 */

import { buildCharacterIdentityPrefillFromPrompt } from "@/lib/studio-character-identity-prompt-prefill";
import type { CharacterIdentityFormValues } from "@/lib/studio-character-identity-fields";
import { buildAssetPromptPrefillProposal } from "@/lib/studio-asset-prompt-prefill";
import type { AssetPromptPrefillProposal, StudioAssetKind } from "@/types/studio-asset-creation";

export type AssetIdentityPrefillFromPromptParams = {
  kind: StudioAssetKind;
  prompt: string;
  usageContext?: string;
  brandRules?: string;
  locale?: "en" | "nl";
};

export type AssetIdentityPrefillFromImagesParams = {
  kind: StudioAssetKind;
  fileNames?: string[];
  userDescription?: string;
  usageContext?: string;
  brandRules?: string;
  locale?: "en" | "nl";
};

/** Prompt → identity prefill for any asset kind (heuristic; character uses rich matcher). */
export function buildAssetIdentityPrefillFromPrompt(
  params: AssetIdentityPrefillFromPromptParams
): AssetPromptPrefillProposal {
  return buildAssetPromptPrefillProposal({
    kind: params.kind,
    prompt: params.prompt,
    usageContext: params.usageContext,
    brandRules: params.brandRules,
    locale: params.locale,
  });
}

/** Image metadata → identity prefill (filename + user context; no vision API for non-character). */
export function buildAssetIdentityPrefillFromImages(
  params: AssetIdentityPrefillFromImagesParams
): AssetPromptPrefillProposal {
  const fileHint = (params.fileNames ?? [])
    .map((n) => n.replace(/\.[a-z0-9]+$/i, "").replace(/[-_]/g, " "))
    .join(" ");
  const syntheticPrompt = [fileHint, params.userDescription?.trim()]
    .filter(Boolean)
    .join(". ")
    .trim();

  if (!syntheticPrompt) {
    return {
      kind: params.kind,
      confidence: 0.15,
      missingFields: ["prompt"],
      reasons: ["source:image", "empty"],
      prefill: {},
    };
  }

  const proposal = buildAssetIdentityPrefillFromPrompt({
    kind: params.kind,
    prompt: syntheticPrompt,
    usageContext: params.usageContext,
    brandRules: params.brandRules,
    locale: params.locale,
  });

  return {
    ...proposal,
    reasons: ["source:image", ...proposal.reasons],
    confidence: Math.max(0.2, proposal.confidence - 0.1),
  };
}

function fieldLabel(field: string): string {
  return field;
}

/** Merge prompt + image proposals; surfaces conflicts for user resolution. */
export function mergeAssetIdentityPrefills(params: {
  kind: StudioAssetKind;
  promptProposal: AssetPromptPrefillProposal | null;
  imageProposal: AssetPromptPrefillProposal | null;
}): AssetPromptPrefillProposal {
  const prompt = params.promptProposal;
  const image = params.imageProposal;
  const base = prompt ?? image;

  if (!base) {
    return {
      kind: params.kind,
      confidence: 0,
      missingFields: [],
      reasons: ["source:merge"],
      prefill: {},
    };
  }

  if (!prompt || !image) {
    return { ...base, reasons: [...base.reasons, "source:merge"] };
  }

  const merged: Record<string, unknown> = { ...image.prefill };
  const conflicts: Array<{ field: string; imageValue: string; promptValue: string }> = [];

  for (const [key, promptValue] of Object.entries(prompt.prefill)) {
    const imageValue = image.prefill[key];
    const pStr = promptValue == null ? "" : String(promptValue).trim();
    const iStr = imageValue == null ? "" : String(imageValue).trim();
    if (!pStr && !iStr) {
      continue;
    }
    if (pStr && iStr && pStr.toLowerCase() !== iStr.toLowerCase()) {
      conflicts.push({ field: fieldLabel(key), imageValue: iStr, promptValue: pStr });
      merged[key] = promptValue;
    } else {
      merged[key] = pStr || iStr;
    }
  }

  const missingFields = [
    ...new Set([...prompt.missingFields, ...image.missingFields]),
  ].filter((f) => {
    const v = merged[f];
    return v == null || String(v).trim() === "";
  });

  return {
    kind: params.kind,
    confidence: Math.min(prompt.confidence, image.confidence) + (conflicts.length ? -0.05 : 0.05),
    missingFields,
    reasons: [...new Set([...prompt.reasons, ...image.reasons, "source:merge"])],
    prefill: merged,
    conflicts: conflicts.length ? conflicts : undefined,
  };
}

/** Apply merged/prompt prefill to character identity (typed helper). */
export function characterPrefillPatch(
  proposal: AssetPromptPrefillProposal
): Partial<CharacterIdentityFormValues> {
  if (proposal.kind !== "character") {
    return {};
  }
  const rich = buildCharacterIdentityPrefillFromPrompt({
    input: {
      prompt: String(proposal.prefill.description ?? ""),
      usageContext: String(proposal.prefill.usageContext ?? ""),
      brandRules: String(proposal.prefill.forbiddenElements ?? ""),
    },
  });
  return rich.prefill;
}
