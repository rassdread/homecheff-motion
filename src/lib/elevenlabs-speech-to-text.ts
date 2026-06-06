/**
 * ElevenLabs Speech-to-Text — runtime wrapper (Studio + Motion).
 */

import type { SpeechToTextInput, SpeechToTextResult, TranscriptWord } from "@/types/studio-speech-to-text";

export const ELEVENLABS_STT_MODEL_ID = "scribe_v2";

const STT_LANGUAGE_CODES = new Set(["en", "nl", "de", "fr", "es", "it", "pt"]);

export function normalizeSttLanguageCode(language: string | undefined): string | undefined {
  if (!language?.trim()) {
    return undefined;
  }
  const code = language.trim().toLowerCase().slice(0, 2);
  return STT_LANGUAGE_CODES.has(code) ? code : undefined;
}

function isTranscriptWord(value: unknown): value is TranscriptWord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const row = value as Record<string, unknown>;
  return (
    typeof row.text === "string" &&
    typeof row.start === "number" &&
    Number.isFinite(row.start) &&
    typeof row.end === "number" &&
    Number.isFinite(row.end)
  );
}

export function parseElevenLabsSpeechToTextResponse(raw: unknown): SpeechToTextResult {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Invalid speech-to-text response.");
  }
  const body = raw as Record<string, unknown>;
  const text = typeof body.text === "string" ? body.text.trim() : "";
  const wordsRaw = Array.isArray(body.words) ? body.words : [];
  const words = wordsRaw.filter(isTranscriptWord);
  const languageCode =
    typeof body.language_code === "string" ? body.language_code.trim().slice(0, 2) : null;
  const durationSeconds =
    words.length > 0 ? Math.max(0, ...words.map((w) => w.end)) : estimateDurationFromText(text);

  return {
    provider: "elevenlabs",
    modelId: ELEVENLABS_STT_MODEL_ID,
    languageCode,
    text,
    words,
    durationSeconds,
  };
}

function estimateDurationFromText(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(0.5, words * 0.35);
}

export async function transcribeElevenLabsSpeech(input: SpeechToTextInput): Promise<SpeechToTextResult> {
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY is not configured.");
  }

  const form = new FormData();
  form.append("model_id", ELEVENLABS_STT_MODEL_ID);
  form.append("source_url", input.audioUrl.trim());
  form.append("timestamps_granularity", "word");
  const lang = normalizeSttLanguageCode(input.languageCode);
  if (lang) {
    form.append("language_code", lang);
  }

  const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
    method: "POST",
    headers: { "xi-api-key": apiKey },
    body: form,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `ElevenLabs speech-to-text failed (${res.status}): ${detail.slice(0, 200) || res.statusText}`
    );
  }

  const json: unknown = await res.json();
  return parseElevenLabsSpeechToTextResponse(json);
}

/** Deterministic mock for dev/tests when no API key. */
export function transcribeMockSpeech(input: SpeechToTextInput): SpeechToTextResult {
  const script =
    input.fallbackScript?.trim() ||
    "Welcome to HomeCheff. This is a preview transcript for your narration audio.";
  const duration = Math.max(1, input.expectedDurationSeconds ?? estimateDurationFromText(script));
  const tokens = script.split(/\s+/).filter(Boolean);
  const step = tokens.length > 0 ? duration / tokens.length : duration;
  let cursor = 0;
  const words: TranscriptWord[] = tokens.map((token, index) => {
    const start = cursor;
    const end = index === tokens.length - 1 ? duration : Math.min(duration, start + step);
    cursor = end;
    return { text: token, start, end, type: "word" };
  });

  return {
    provider: "mock",
    modelId: "mock-stt",
    languageCode: normalizeSttLanguageCode(input.languageCode) ?? "en",
    text: script,
    words,
    durationSeconds: duration,
  };
}
