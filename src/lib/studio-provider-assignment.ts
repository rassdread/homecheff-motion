/**
 * Studio V41 — provider assignment engine (planning only).
 */

import {
  buildProviderCapabilityMatrix,
  providerSupportsLanguage,
} from "@/lib/studio-provider-capabilities";
import { resolveFallbackProviderId } from "@/lib/studio-provider-fallback";
import { listStudioProviders } from "@/lib/studio-provider-registry";
import type {
  ProviderAssignment,
  ProviderAssignmentInput,
  StudioProviderId,
  StudioProviderType,
} from "@/types/studio-provider-execution";

const DEFAULT_BY_TYPE: Record<StudioProviderType, StudioProviderId> = {
  voice: "elevenlabs",
  music: "suno",
  sound: "freesound",
  image: "openai_images",
  video: "vidu",
};

const REASON_BY_TYPE: Record<StudioProviderType, string> = {
  voice: "studio.provider.assignment.voiceDefault",
  music: "studio.provider.assignment.musicDefault",
  sound: "studio.provider.assignment.soundDefault",
  image: "studio.provider.assignment.imageDefault",
  video: "studio.provider.assignment.videoDefault",
};

export function resolveProviderAssignment(
  input: ProviderAssignmentInput
): ProviderAssignment {
  const capabilities = buildProviderCapabilityMatrix();
  const candidates = listStudioProviders({
    providerType: input.assetType,
    enabledOnly: true,
  });

  let selectedId = DEFAULT_BY_TYPE[input.assetType];
  const preferred = candidates.find((p) => p.id === selectedId);
  if (!preferred) {
    selectedId = candidates[0]?.id ?? selectedId;
  }

  if (input.qualityProfile === "premium" && input.assetType === "video") {
    const runway = candidates.find((p) => p.id === "runway");
    if (runway) {
      selectedId = "runway";
    }
  }

  if (input.costProfile === "economy" && input.assetType === "sound") {
    selectedId = "freesound";
  }

  const cap = capabilities.find((c) => c.providerId === selectedId);
  if (cap && !providerSupportsLanguage(cap, input.language)) {
    const langMatch = candidates.find((p) => {
      const row = capabilities.find((c) => c.providerId === p.id);
      return row ? providerSupportsLanguage(row, input.language) : false;
    });
    if (langMatch) {
      selectedId = langMatch.id;
    }
  }

  const provider = candidates.find((p) => p.id === selectedId) ?? preferred;
  const name = provider?.name ?? selectedId;

  return {
    assetType: input.assetType,
    selectedProviderId: selectedId,
    selectedProviderName: name,
    fallbackProviderId: resolveFallbackProviderId(selectedId, input.assetType),
    reasonKey: REASON_BY_TYPE[input.assetType],
  };
}

export function resolveAllProviderAssignments(params: {
  language?: string;
  costProfile?: "economy" | "balanced" | "quality";
  qualityProfile?: "draft" | "standard" | "premium";
}): ProviderAssignment[] {
  const types: StudioProviderType[] = ["voice", "music", "sound", "image", "video"];
  return types.map((assetType) =>
    resolveProviderAssignment({
      assetType,
      language: params.language,
      costProfile: params.costProfile,
      qualityProfile: params.qualityProfile,
    })
  );
}
