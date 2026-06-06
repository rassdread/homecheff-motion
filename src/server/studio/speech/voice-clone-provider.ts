import {
  cloneElevenLabsVoice,
  cloneMockVoice,
  type VoiceCloneInput,
} from "@/lib/elevenlabs-voice-clone";
import type { VoiceCloneResult } from "@/types/studio-voice-clone";

export type VoiceCloneProviderId = "elevenlabs" | "mock";

export type VoiceCloneProvider = {
  id: VoiceCloneProviderId;
  clone(input: VoiceCloneInput): Promise<VoiceCloneResult>;
};

export function selectVoiceCloneProvider(preferred?: VoiceCloneProviderId): VoiceCloneProvider {
  if (preferred === "mock" || process.env.STUDIO_VOICE_CLONE_PROVIDER === "mock") {
    return { id: "mock", clone: async (input) => cloneMockVoice(input) };
  }
  if (process.env.ELEVENLABS_API_KEY?.trim()) {
    return { id: "elevenlabs", clone: cloneElevenLabsVoice };
  }
  return { id: "mock", clone: async (input) => cloneMockVoice(input) };
}
