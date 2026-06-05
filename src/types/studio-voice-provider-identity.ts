/**
 * V39 future hooks — external voice providers (not integrated in V39).
 */

export type StudioVoiceProviderIdentityId =
  | "elevenlabs"
  | "openai_voice"
  | "azure_voice"
  | "custom_clone"
  | "homecheff_library";

export type StudioVoiceCloneRequest = {
  characterId: string;
  language: string;
  sampleAudioUrl?: string;
};

export type StudioVoiceCloneResult = {
  providerId: StudioVoiceProviderIdentityId;
  status: "not_implemented" | "queued" | "completed" | "failed";
  providerVoiceId?: string;
  message?: string;
};

export interface StudioVoiceProviderIdentityAdapter {
  id: StudioVoiceProviderIdentityId;
  displayName: string;
  isConfigured(): boolean;
  resolveProviderVoiceId(params: {
    voiceProfile: string;
    language: string;
    gender?: string;
  }): Promise<string | null>;
  cloneVoice(request: StudioVoiceCloneRequest): Promise<StudioVoiceCloneResult>;
}
