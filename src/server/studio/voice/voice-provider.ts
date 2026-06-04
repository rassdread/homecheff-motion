import type { ElevenLabsVoiceRequest } from "@/lib/elevenlabs-voice";
import type { VoiceGenerationResult, StudioVoiceProviderId } from "@/types/studio-voice-execution";

export type VoiceSynthesisInput = {
  request: ElevenLabsVoiceRequest;
  voiceProfile: string;
  voiceLanguage: string;
};

export type VoiceProvider = {
  id: StudioVoiceProviderId;
  synthesize(input: VoiceSynthesisInput): Promise<VoiceGenerationResult>;
};

export function selectVoiceProvider(preferred?: StudioVoiceProviderId): VoiceProvider {
  if (preferred === "mock" || process.env.STUDIO_VOICE_PROVIDER === "mock") {
    return createMockVoiceProvider();
  }
  if (process.env.ELEVENLABS_API_KEY?.trim()) {
    return createElevenLabsVoiceProvider();
  }
  return createMockVoiceProvider();
}

function createElevenLabsVoiceProvider(): VoiceProvider {
  return {
    id: "elevenlabs",
    async synthesize(input) {
      const { synthesizeElevenLabsSpeech } = await import("@/lib/elevenlabs-voice");
      const result = await synthesizeElevenLabsSpeech({
        request: input.request,
        voiceProfile: input.voiceProfile,
      });
      return {
        audioBuffer: result.audioBuffer,
        durationSeconds: result.durationSeconds,
        provider: "elevenlabs",
        providerVoiceId: result.providerVoiceId,
        providerModelId: result.providerModelId,
        providerMetadata: {
          language: input.voiceLanguage,
          characterCount: result.characterCount,
        },
      };
    },
  };
}

function createMockVoiceProvider(): VoiceProvider {
  return {
    id: "mock",
    async synthesize(input) {
      const text = input.request.text.trim();
      const chars = text.length;
      const durationSeconds = Math.max(1, Math.min(120, chars / 14));
      const sampleRate = 8000;
      const numSamples = Math.floor(sampleRate * durationSeconds);
      const buffer = Buffer.alloc(44 + numSamples);
      buffer.write("RIFF", 0);
      buffer.writeUInt32LE(36 + numSamples, 4);
      buffer.write("WAVE", 8);
      buffer.write("fmt ", 12);
      buffer.writeUInt32LE(16, 16);
      buffer.writeUInt16LE(1, 20);
      buffer.writeUInt16LE(1, 22);
      buffer.writeUInt32LE(sampleRate, 24);
      buffer.writeUInt32LE(sampleRate, 28);
      buffer.writeUInt16LE(1, 32);
      buffer.writeUInt16LE(8, 34);
      buffer.write("data", 36);
      buffer.writeUInt32LE(numSamples, 40);
      return {
        audioBuffer: buffer,
        durationSeconds,
        provider: "mock",
        providerVoiceId: "mock-voice",
        providerModelId: "mock-tts",
        providerMetadata: { mock: true, characters: chars },
      };
    },
  };
}
