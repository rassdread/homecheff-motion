/**
 * Studio V41 — provider capability matrix (future-ready, planning only).
 */

import { STUDIO_PROVIDER_REGISTRY } from "@/lib/studio-provider-registry";
import type { ProviderCapability, StudioProviderId } from "@/types/studio-provider-execution";

const CAPABILITY_BY_ID: Record<
  StudioProviderId,
  Omit<ProviderCapability, "providerId">
> = {
  elevenlabs: {
    languages: ["en", "nl", "de", "fr", "es"],
    voiceSupport: true,
    musicSupport: false,
    soundSupport: false,
    videoSupport: false,
    imageSupport: false,
  },
  openai_voice: {
    languages: ["en", "nl", "de", "fr", "es", "it"],
    voiceSupport: true,
    musicSupport: false,
    soundSupport: false,
    videoSupport: false,
    imageSupport: false,
  },
  azure_voice: {
    languages: ["en", "nl", "de", "fr"],
    voiceSupport: true,
    musicSupport: false,
    soundSupport: false,
    videoSupport: false,
    imageSupport: false,
  },
  suno: {
    languages: ["en"],
    voiceSupport: false,
    musicSupport: true,
    soundSupport: false,
    videoSupport: false,
    imageSupport: false,
  },
  udio: {
    languages: ["en"],
    voiceSupport: false,
    musicSupport: true,
    soundSupport: false,
    videoSupport: false,
    imageSupport: false,
  },
  freesound: {
    languages: ["*"],
    voiceSupport: false,
    musicSupport: false,
    soundSupport: true,
    videoSupport: false,
    imageSupport: false,
  },
  artlist: {
    languages: ["*"],
    voiceSupport: false,
    musicSupport: false,
    soundSupport: true,
    videoSupport: false,
    imageSupport: false,
  },
  openai_images: {
    languages: ["*"],
    voiceSupport: false,
    musicSupport: false,
    soundSupport: false,
    videoSupport: false,
    imageSupport: true,
  },
  vidu: {
    languages: ["*"],
    voiceSupport: false,
    musicSupport: false,
    soundSupport: false,
    videoSupport: true,
    imageSupport: false,
  },
  kling: {
    languages: ["*"],
    voiceSupport: false,
    musicSupport: false,
    soundSupport: false,
    videoSupport: true,
    imageSupport: false,
  },
  runway: {
    languages: ["*"],
    voiceSupport: false,
    musicSupport: false,
    soundSupport: false,
    videoSupport: true,
    imageSupport: false,
  },
  mock: {
    languages: ["*"],
    voiceSupport: true,
    musicSupport: true,
    soundSupport: true,
    videoSupport: true,
    imageSupport: true,
  },
};

export function buildProviderCapabilityMatrix(): ProviderCapability[] {
  return STUDIO_PROVIDER_REGISTRY.filter((p) => p.enabled).map((provider) => ({
    providerId: provider.id,
    ...CAPABILITY_BY_ID[provider.id],
  }));
}

export function providerSupportsLanguage(
  capability: ProviderCapability,
  language: string | undefined
): boolean {
  if (!language?.trim()) {
    return true;
  }
  const code = language.trim().toLowerCase().slice(0, 2);
  return (
    capability.languages.includes("*") || capability.languages.includes(code)
  );
}
