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

  for (const ref of input.payload.references) {
    push({
      url: ref.url,
      referenceId: ref.referenceId,
      role: ref.isLogo ? "logo" : inferReferenceRole(ref.role),
      name: ref.name,
      isLogo: ref.isLogo,
      preserveOriginal: ref.isLogo,
    });
  }

  for (const logo of input.payload.logoAssets) {
    push({
      url: logo.url,
      referenceId: logo.referenceId,
      role: "logo",
      name: logo.name,
      isLogo: true,
      preserveOriginal: true,
    });
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
