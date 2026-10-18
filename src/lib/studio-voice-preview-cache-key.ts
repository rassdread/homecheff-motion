import { buildVoicePreviewDedupHash } from "@/server/provider-cost/studio-cost-metering";
import type { VoicePreviewType } from "@/types/studio-voice-preview-cache";

export function sanitizeVoicePreviewVoiceId(voiceId: string): string {
  const trimmed = voiceId.trim().toLowerCase();
  const safe = trimmed.replace(/[^a-z0-9_-]/g, "-").replace(/-+/g, "-");
  return safe.slice(0, 80) || "unknown-voice";
}

export type VoicePreviewCacheSettings = {
  stability: number;
  similarity_boost: number;
  style: number;
};

export function buildVoicePreviewTextHash(params: {
  voiceId: string;
  previewText: string;
  language: string;
  modelId: string;
  speechSpeed?: number;
  voiceSettings?: VoicePreviewCacheSettings;
  provider?: string;
}): string {
  const speed = params.speechSpeed;
  let previewText = params.previewText;
  if (params.provider) {
    previewText += `\n[provider:${params.provider}]`;
  }
  if (speed != null && speed !== 1) {
    previewText += `\n[speed:${speed}]`;
  }
  if (params.voiceSettings) {
    const settings = params.voiceSettings;
    previewText += `\n[settings:${settings.stability}:${settings.similarity_boost}:${settings.style}]`;
  }
  return buildVoicePreviewDedupHash({
    voiceId: params.voiceId,
    previewText,
    language: params.language,
    modelId: params.modelId,
  });
}

export function voicePreviewBlobPathname(voiceId: string, textHash: string): string {
  return `studio/voice-previews/${sanitizeVoicePreviewVoiceId(voiceId)}/${textHash}.mp3`;
}

export const VOICE_PREVIEW_CACHE_MANIFEST_PATH = "studio/voice-previews/manifest.json";

export function normalizeVoicePreviewType(value: unknown): VoicePreviewType {
  const v = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (
    v === "chef" ||
    v === "garden" ||
    v === "designer" ||
    v === "community" ||
    v === "generic" ||
    v === "custom"
  ) {
    return v;
  }
  return "generic";
}

export function inferVoicePreviewType(params: {
  sampleLine?: string;
  defaultLine: string;
  explicitType?: string;
}): VoicePreviewType {
  if (params.explicitType) {
    return normalizeVoicePreviewType(params.explicitType);
  }
  const sample = params.sampleLine?.trim();
  if (sample && sample !== params.defaultLine.trim()) {
    return "custom";
  }
  return "generic";
}
