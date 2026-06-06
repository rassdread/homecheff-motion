import {
  transcribeElevenLabsSpeech,
  transcribeMockSpeech,
} from "@/lib/elevenlabs-speech-to-text";
import type { SpeechToTextInput, SpeechToTextResult } from "@/types/studio-speech-to-text";

export type SttProviderId = "elevenlabs" | "mock";

export type SttProvider = {
  id: SttProviderId;
  transcribe(input: SpeechToTextInput): Promise<SpeechToTextResult>;
};

export function selectSttProvider(preferred?: SttProviderId): SttProvider {
  if (preferred === "mock" || process.env.STUDIO_STT_PROVIDER === "mock") {
    return createMockSttProvider();
  }
  if (process.env.ELEVENLABS_API_KEY?.trim()) {
    return createElevenLabsSttProvider();
  }
  return createMockSttProvider();
}

function createElevenLabsSttProvider(): SttProvider {
  return {
    id: "elevenlabs",
    transcribe: transcribeElevenLabsSpeech,
  };
}

function createMockSttProvider(): SttProvider {
  return {
    id: "mock",
    async transcribe(input) {
      return transcribeMockSpeech(input);
    },
  };
}
