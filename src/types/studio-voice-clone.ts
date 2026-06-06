/** Studio voice clone result types (ElevenLabs IVC). */

export type VoiceCloneProviderId = "elevenlabs" | "mock";

export type VoiceCloneResult = {
  provider: VoiceCloneProviderId;
  providerVoiceId: string;
  /** Stored on character as voiceProfile. */
  voiceProfileRef: string;
  status: "completed" | "failed";
  requiresVerification?: boolean;
  message?: string;
};
