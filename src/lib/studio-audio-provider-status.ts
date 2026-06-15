import type { VoiceLibraryCatalog } from "@/lib/studio-voice-library-catalog";

export type StudioAudioProviderStatus = {
  voice: {
    configured: boolean;
    catalogSource: VoiceLibraryCatalog["source"] | "unknown";
    messageKey: string;
  };
  music: {
    configured: boolean;
    generationReady: boolean;
    messageKey: string;
  };
  sfx: {
    configured: boolean;
    generationReady: boolean;
    messageKey: string;
  };
};

export function resolveStudioVoiceProviderStatus(
  catalog: VoiceLibraryCatalog | null | undefined
): StudioAudioProviderStatus["voice"] {
  const source = catalog?.source ?? "unknown";
  const configured = source === "elevenlabs";
  return {
    configured,
    catalogSource: source,
    messageKey:
      configured
        ? "studio.v9.provider.voice.ready"
        : source === "mock"
          ? "studio.v9.provider.voice.mock"
          : "studio.v9.provider.voice.unavailable",
  };
}

export function resolveStudioMusicProviderStatus(): StudioAudioProviderStatus["music"] {
  const hasKey = Boolean(process.env.ELEVENLABS_API_KEY?.trim());
  return {
    configured: hasKey,
    generationReady: false,
    messageKey: hasKey
      ? "studio.v9.provider.music.providerReady"
      : "studio.v9.provider.music.unavailable",
  };
}

export function resolveStudioSfxProviderStatus(): StudioAudioProviderStatus["sfx"] {
  const hasKey = Boolean(process.env.ELEVENLABS_API_KEY?.trim());
  return {
    configured: hasKey,
    generationReady: false,
    messageKey: hasKey
      ? "studio.v9.provider.sfx.providerReady"
      : "studio.v9.provider.sfx.unavailable",
  };
}

export function resolveClientStudioMusicProviderStatus(): StudioAudioProviderStatus["music"] {
  return {
    configured: true,
    generationReady: false,
    messageKey: "studio.v9.provider.music.providerReady",
  };
}

export function resolveClientStudioSfxProviderStatus(): StudioAudioProviderStatus["sfx"] {
  return {
    configured: true,
    generationReady: false,
    messageKey: "studio.v9.provider.sfx.providerReady",
  };
}
