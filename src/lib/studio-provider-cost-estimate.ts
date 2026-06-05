/**
 * Studio V41 — per-provider cost planning (no billing changes).
 */

import { getStudioProvider } from "@/lib/studio-provider-registry";
import type {
  ProviderCostEstimate,
  StudioProviderId,
  StudioProviderType,
} from "@/types/studio-provider-execution";

const BASE_CREDITS: Record<StudioProviderType, number> = {
  voice: 12,
  music: 28,
  sound: 4,
  image: 18,
  video: 85,
};

const BASE_EUR: Record<StudioProviderType, number> = {
  voice: 0.18,
  music: 0.42,
  sound: 0.05,
  image: 0.24,
  video: 1.2,
};

const BASE_DURATION: Record<StudioProviderType, number> = {
  voice: 45,
  music: 120,
  sound: 15,
  image: 60,
  video: 180,
};

const QUALITY_MULTIPLIER = {
  draft: 0.75,
  standard: 1,
  premium: 1.35,
} as const;

const COST_MULTIPLIER = {
  economy: 0.8,
  balanced: 1,
  quality: 1.25,
} as const;

export function estimateProviderCost(params: {
  providerId: StudioProviderId;
  providerType: StudioProviderType;
  sceneCount?: number;
  qualityProfile?: "draft" | "standard" | "premium";
  costProfile?: "economy" | "balanced" | "quality";
}): ProviderCostEstimate {
  const provider = getStudioProvider(params.providerId);
  const scenes = Math.max(1, params.sceneCount ?? 1);
  const quality = QUALITY_MULTIPLIER[params.qualityProfile ?? "standard"];
  const cost = COST_MULTIPLIER[params.costProfile ?? "balanced"];
  const type = params.providerType;

  const estimatedCredits = Math.round(BASE_CREDITS[type] * scenes * quality * cost);
  const estimatedCostEur =
    Math.round(BASE_EUR[type] * scenes * quality * cost * 100) / 100;
  const estimatedDurationSeconds =
    (provider?.latencySeconds ?? BASE_DURATION[type]) +
    Math.max(0, scenes - 1) * Math.round(BASE_DURATION[type] * 0.15);

  return {
    providerId: params.providerId,
    providerType: type,
    estimatedCredits,
    estimatedCostEur,
    estimatedDurationSeconds,
  };
}

export function sumProviderCostEstimates(
  rows: ProviderCostEstimate[]
): { totalCredits: number; totalCostEur: number; maxLatencySeconds: number } {
  let totalCredits = 0;
  let totalCostEur = 0;
  let maxLatencySeconds = 0;
  for (const row of rows) {
    totalCredits += row.estimatedCredits;
    totalCostEur += row.estimatedCostEur;
    maxLatencySeconds = Math.max(maxLatencySeconds, row.estimatedDurationSeconds);
  }
  return {
    totalCredits,
    totalCostEur: Math.round(totalCostEur * 100) / 100,
    maxLatencySeconds,
  };
}
