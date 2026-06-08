/**
 * Studio provider cost planning constants (no API calls).
 * Sources: OpenAI pricing docs, ElevenLabs API pricing (2026-06).
 */

/** DALL·E 3 standard 1024×1024 — OpenAI published $0.04/image. */
export const OPENAI_DALLE3_IMAGE_USD = 0.04;

/** gpt-4o-mini vision — flat estimate per call (no token logging in app). */
export const OPENAI_VISION_BASE_USD = 0.012;

/** Additional reference image in same vision call. */
export const OPENAI_VISION_EXTRA_IMAGE_USD = 0.003;

/** ElevenLabs Multilingual v2 — $0.10 / 1K characters (API pricing page). */
export const ELEVENLABS_MULTILINGUAL_V2_PER_CHAR_USD = 0.1 / 1000;

/** ElevenLabs Flash/Turbo — $0.05 / 1K characters. */
export const ELEVENLABS_FLASH_PER_CHAR_USD = 0.05 / 1000;

/** ElevenLabs STT Scribe — ~$0.22 / audio minute (API pricing; estimated). */
export const ELEVENLABS_STT_PER_MINUTE_USD = 0.22 / 60;

/** ElevenLabs IVC clone — no flat API price published; planning estimate. */
export const ELEVENLABS_VOICE_CLONE_ESTIMATE_USD = 1.0;

/** OpenAI translation — heuristic per 1K tokens (translate-language-text). */
export const OPENAI_TRANSLATION_PER_TOKEN_USD = 0.000002;

export function estimateOpenAiVisionCostUsd(imageCount: number): number {
  const count = Math.max(1, Math.round(imageCount));
  const cost = OPENAI_VISION_BASE_USD + Math.max(0, count - 1) * OPENAI_VISION_EXTRA_IMAGE_USD;
  return Math.round(cost * 10000) / 10000;
}

export function estimateElevenLabsTtsCostUsd(params: {
  characterCount: number;
  modelId?: string;
}): number {
  const chars = Math.max(0, params.characterCount);
  const model = params.modelId?.trim().toLowerCase() ?? "";
  const perChar =
    model.includes("flash") || model.includes("turbo")
      ? ELEVENLABS_FLASH_PER_CHAR_USD
      : ELEVENLABS_MULTILINGUAL_V2_PER_CHAR_USD;
  return Math.round(chars * perChar * 10000) / 10000;
}

export function estimateElevenLabsSttCostUsd(durationSeconds: number): number {
  const minutes = Math.max(0, durationSeconds) / 60;
  return Math.round(minutes * ELEVENLABS_STT_PER_MINUTE_USD * 10000) / 10000;
}
