/** Studio — ElevenLabs speech-to-text result types (shared Studio + Motion). */

export type TranscriptWordType = "word" | "spacing" | "audio_event" | "punctuation" | string;

export type TranscriptWord = {
  text: string;
  start: number;
  end: number;
  type?: TranscriptWordType;
  speakerId?: string;
};

export type SpeechToTextResult = {
  provider: "elevenlabs" | "mock";
  modelId: string;
  languageCode: string | null;
  text: string;
  words: TranscriptWord[];
  durationSeconds: number;
};

export type SpeechToTextInput = {
  /** HTTPS URL to audio (e.g. Vercel Blob from voice generation). */
  audioUrl: string;
  languageCode?: string;
  /** Hint for mock provider when API key is absent. */
  fallbackScript?: string;
  expectedDurationSeconds?: number;
};
