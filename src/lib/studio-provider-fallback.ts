/**
 * Studio V41 — fallback planning (no automatic execution).
 */

import type {
  ProviderFallbackPlan,
  ProviderFallbackStep,
  StudioProviderId,
  StudioProviderType,
} from "@/types/studio-provider-execution";

const FALLBACK_CHAINS: Array<{
  assetType: StudioProviderType;
  from: StudioProviderId;
  to: StudioProviderId;
}> = [
  { assetType: "voice", from: "elevenlabs", to: "openai_voice" },
  { assetType: "voice", from: "openai_voice", to: "azure_voice" },
  { assetType: "music", from: "suno", to: "udio" },
  { assetType: "sound", from: "freesound", to: "artlist" },
  { assetType: "video", from: "vidu", to: "kling" },
  { assetType: "video", from: "kling", to: "runway" },
];

export function buildProviderFallbackPlan(): ProviderFallbackPlan {
  const steps: ProviderFallbackStep[] = FALLBACK_CHAINS.filter(
    (row) => row.from !== row.to
  ).map((row) => ({
    fromProviderId: row.from,
    toProviderId: row.to,
    assetType: row.assetType,
    automatic: false,
  }));

  return {
    enabled: steps.length > 0,
    steps,
  };
}

export function resolveFallbackProviderId(
  providerId: StudioProviderId,
  assetType: StudioProviderType
): StudioProviderId | null {
  const hit = FALLBACK_CHAINS.find(
    (row) => row.assetType === assetType && row.from === providerId && row.from !== row.to
  );
  return hit?.to ?? null;
}
