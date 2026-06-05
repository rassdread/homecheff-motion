/**
 * Studio V41 — provider registry (metadata only, no API calls).
 */

import type { StudioProvider, StudioProviderId, StudioProviderType } from "@/types/studio-provider-execution";

export const STUDIO_PROVIDER_REGISTRY: StudioProvider[] = [
  {
    id: "elevenlabs",
    name: "ElevenLabs",
    providerType: "voice",
    enabled: true,
    priority: 1,
    status: "planned",
    latencySeconds: 45,
    supportsFallback: true,
    costTrackingEnabled: true,
  },
  {
    id: "openai_voice",
    name: "OpenAI Voice",
    providerType: "voice",
    enabled: true,
    priority: 2,
    status: "planned",
    latencySeconds: 30,
    supportsFallback: true,
    costTrackingEnabled: true,
  },
  {
    id: "azure_voice",
    name: "Azure Voice",
    providerType: "voice",
    enabled: true,
    priority: 3,
    status: "planned",
    latencySeconds: 40,
    supportsFallback: true,
    costTrackingEnabled: true,
  },
  {
    id: "suno",
    name: "Suno",
    providerType: "music",
    enabled: true,
    priority: 1,
    status: "planned",
    latencySeconds: 120,
    supportsFallback: true,
    costTrackingEnabled: true,
  },
  {
    id: "udio",
    name: "Udio",
    providerType: "music",
    enabled: true,
    priority: 2,
    status: "planned",
    latencySeconds: 120,
    supportsFallback: true,
    costTrackingEnabled: true,
  },
  {
    id: "freesound",
    name: "Freesound",
    providerType: "sound",
    enabled: true,
    priority: 1,
    status: "planned",
    latencySeconds: 15,
    supportsFallback: true,
    costTrackingEnabled: false,
  },
  {
    id: "artlist",
    name: "Artlist",
    providerType: "sound",
    enabled: true,
    priority: 2,
    status: "planned",
    latencySeconds: 20,
    supportsFallback: false,
    costTrackingEnabled: true,
  },
  {
    id: "openai_images",
    name: "OpenAI Images",
    providerType: "image",
    enabled: true,
    priority: 1,
    status: "planned",
    latencySeconds: 60,
    supportsFallback: true,
    costTrackingEnabled: true,
  },
  {
    id: "vidu",
    name: "Vidu",
    providerType: "video",
    enabled: true,
    priority: 1,
    status: "planned",
    latencySeconds: 180,
    supportsFallback: true,
    costTrackingEnabled: true,
  },
  {
    id: "kling",
    name: "Kling",
    providerType: "video",
    enabled: true,
    priority: 2,
    status: "planned",
    latencySeconds: 200,
    supportsFallback: true,
    costTrackingEnabled: true,
  },
  {
    id: "runway",
    name: "Runway",
    providerType: "video",
    enabled: true,
    priority: 3,
    status: "planned",
    latencySeconds: 240,
    supportsFallback: true,
    costTrackingEnabled: true,
  },
  {
    id: "mock",
    name: "Mock (dev)",
    providerType: "video",
    enabled: false,
    priority: 99,
    status: "disabled",
    latencySeconds: 5,
    supportsFallback: false,
    costTrackingEnabled: false,
  },
];

export function listStudioProviders(filter?: {
  providerType?: StudioProviderType;
  enabledOnly?: boolean;
}): StudioProvider[] {
  let rows = [...STUDIO_PROVIDER_REGISTRY];
  if (filter?.providerType) {
    rows = rows.filter((p) => p.providerType === filter.providerType);
  }
  if (filter?.enabledOnly) {
    rows = rows.filter((p) => p.enabled);
  }
  return rows.sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name));
}

export function getStudioProvider(id: StudioProviderId): StudioProvider | null {
  return STUDIO_PROVIDER_REGISTRY.find((p) => p.id === id) ?? null;
}

export function registrySummaryLine(): string {
  const byType = new Map<StudioProviderType, number>();
  for (const row of STUDIO_PROVIDER_REGISTRY.filter((p) => p.enabled)) {
    byType.set(row.providerType, (byType.get(row.providerType) ?? 0) + 1);
  }
  return [...byType.entries()]
    .map(([type, count]) => `${type}: ${count}`)
    .join(" · ");
}
