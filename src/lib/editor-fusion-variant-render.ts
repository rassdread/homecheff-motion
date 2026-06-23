/**
 * Fusion variant render — maps FusionRenderPayload to multi-image provider slots.
 */

import type { FusionRenderPayload, FusionRunRecord } from "@/types/editor-fusion-intelligence";
import type { EditorInstructionReference } from "@/types/editor-instruction-studio";
import type { OpenAiImageEditReferenceImage } from "@/lib/openai-image-generation";

export type FusionVariantImageSlot = {
  url: string;
  referenceId: string;
  role?: "reference" | "logo" | "product" | "background";
  name?: string;
  isLogo?: boolean;
  preserveOriginal?: boolean;
  preserveMode?: "prompt_only" | "reference_asset" | "post_composite";
};

export function resolveFusionVariantImageSlots(input: {
  primaryImageUrl: string;
  payload?: FusionRenderPayload | null;
}): FusionVariantImageSlot[] {
  const primary = input.primaryImageUrl.trim();
  const slots: FusionVariantImageSlot[] = [];
  const seen = new Set<string>();

  function push(slot: FusionVariantImageSlot) {
    const url = slot.url.trim();
    if (!url || seen.has(url) || url === primary) {
      return;
    }
    seen.add(url);
    slots.push({ ...slot, url });
  }

  if (!input.payload) {
    return slots;
  }

  const protectedByUrl = new Map(
    (input.payload.brandProtection?.assets ?? []).map((a) => [a.sourceUrl.trim(), a])
  );

  function resolvePreserve(slot: FusionVariantImageSlot): FusionVariantImageSlot {
    const protectedAsset = protectedByUrl.get(slot.url.trim());
    if (!protectedAsset) {
      return slot;
    }
    const mustPreserve =
      protectedAsset.preserveMode === "reference_asset" ||
      protectedAsset.preserveMode === "post_composite" ||
      protectedAsset.mustRemainExact;
    return {
      ...slot,
      preserveOriginal: mustPreserve || slot.preserveOriginal,
      preserveMode: protectedAsset.preserveMode,
      isLogo: slot.isLogo || protectedAsset.assetType === "logo" || protectedAsset.assetType === "text_logo",
      role:
        protectedAsset.assetType === "logo" || protectedAsset.assetType === "text_logo"
          ? "logo"
          : slot.role,
    };
  }

  for (const ref of input.payload.references) {
    push(
      resolvePreserve({
        url: ref.url,
        referenceId: ref.referenceId,
        role: ref.isLogo ? "logo" : inferReferenceRole(ref.role),
        name: ref.name,
        isLogo: ref.isLogo,
        preserveOriginal: ref.isLogo,
      })
    );
  }

  for (const logo of input.payload.logoAssets) {
    push(
      resolvePreserve({
        url: logo.url,
        referenceId: logo.referenceId,
        role: "logo",
        name: logo.name,
        isLogo: true,
        preserveOriginal: true,
        preserveMode: "reference_asset",
      })
    );
  }

  for (const asset of input.payload.brandProtection?.referenceAssets ?? []) {
    if (asset.preserveMode !== "reference_asset") {
      continue;
    }
    push(
      resolvePreserve({
        url: asset.sourceUrl,
        referenceId: asset.id,
        role: "logo",
        name: asset.label ?? "Protected brand asset",
        isLogo: true,
        preserveOriginal: true,
        preserveMode: asset.preserveMode,
      })
    );
  }

  return slots;
}

function inferReferenceRole(role?: string): FusionVariantImageSlot["role"] {
  if (!role) {
    return "reference";
  }
  const lower = role.toLowerCase();
  if (lower === "logo") {
    return "logo";
  }
  if (lower === "background" || lower === "environment") {
    return "background";
  }
  if (lower === "product" || lower === "packaging") {
    return "product";
  }
  return "reference";
}

export function fusionPayloadToInstructionReferences(
  payload?: FusionRenderPayload | null
): EditorInstructionReference[] {
  if (!payload) {
    return [];
  }
  const refs: EditorInstructionReference[] = [];
  for (const ref of payload.references) {
    refs.push({
      assetId: ref.referenceId,
      url: ref.url,
      label: ref.name ?? ref.role ?? ref.referenceId,
      type: ref.isLogo ? "LOGO_REFERENCE" : "STYLE_REFERENCE",
    });
  }
  for (const logo of payload.logoAssets) {
    refs.push({
      assetId: logo.referenceId,
      url: logo.url,
      label: logo.name ?? "Logo",
      type: "LOGO_REFERENCE",
    });
  }
  return refs;
}

export function fusionVariantImageSlotsToOpenAiReferences(
  slots: FusionVariantImageSlot[]
): OpenAiImageEditReferenceImage[] {
  return slots.map((slot, index) => ({
    buffer: Buffer.alloc(0),
    filename:
      slot.role === "logo"
        ? `logo_${slot.referenceId || index}.png`
        : `${slot.role ?? "reference"}_${slot.referenceId || index}.png`,
    contentType: "image/png",
    role: slot.role ?? "reference",
    referenceId: slot.referenceId,
  }));
}

export function buildFusionRunRecord(input: {
  workflowType: FusionRunRecord["fusionWorkflowType"];
  blueprintId?: string | null;
  payload?: FusionRenderPayload | null;
  slots: FusionVariantImageSlot[];
  creditsCharged: number;
  providerCostUsd: number;
  estimatedProfitUsd: number;
  providerSupportsMultiReference: boolean;
  referenceImageCount: number;
  status: FusionRunRecord["status"];
  errorCode?: string | null;
}): FusionRunRecord {
  const profiles = input.payload?.referenceAnalysis ?? [];
  return {
    fusionWorkflowType: input.workflowType,
    fusionBlueprintId: input.blueprintId ?? input.payload?.blueprint.id ?? null,
    referencesUsed: input.slots.map((s) => s.referenceId),
    premiumAnalysesUsed: profiles.filter((p) => !p.premiumCached).length,
    cachedAnalysesUsed: profiles.filter((p) => p.premiumCached).length,
    creditsCharged: input.creditsCharged,
    providerCostUsd: input.providerCostUsd,
    estimatedProfitUsd: input.estimatedProfitUsd,
    providerSupportsMultiReference: input.providerSupportsMultiReference,
    referenceImageCount: input.referenceImageCount,
    status: input.status,
    errorCode: input.errorCode ?? null,
    completedAt: new Date().toISOString(),
  };
}

export function countFusionPayloadReferences(payload?: FusionRenderPayload | null): number {
  if (!payload) {
    return 0;
  }
  const urls = new Set<string>();
  for (const ref of payload.references) {
    if (ref.url.trim()) {
      urls.add(ref.url.trim());
    }
  }
  for (const logo of payload.logoAssets) {
    if (logo.url.trim()) {
      urls.add(logo.url.trim());
    }
  }
  return urls.size;
}
