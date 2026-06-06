/** Storyboard narration audio helpers — TTS, upload, and shared voice rows. */

export const STORYBOARD_AUDIO_UPLOAD_PROVIDER = "upload";

export type StoryboardVoiceMetadata = {
  source?: "tts" | "upload";
  displayName?: string;
  uploadedAt?: string;
  fileName?: string;
};

export function parseStoryboardVoiceMetadata(raw: unknown): StoryboardVoiceMetadata {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }
  const row = raw as Record<string, unknown>;
  const source = row.source === "tts" || row.source === "upload" ? row.source : undefined;
  return {
    source,
    displayName: typeof row.displayName === "string" ? row.displayName : undefined,
    uploadedAt: typeof row.uploadedAt === "string" ? row.uploadedAt : undefined,
    fileName: typeof row.fileName === "string" ? row.fileName : undefined,
  };
}

export function isUploadedStoryboardVoice(voice: {
  provider?: string | null;
  providerMetadata?: unknown;
} | null | undefined): boolean {
  if (!voice) {
    return false;
  }
  if (voice.provider === STORYBOARD_AUDIO_UPLOAD_PROVIDER) {
    return true;
  }
  return parseStoryboardVoiceMetadata(voice.providerMetadata).source === "upload";
}

export function storyboardVoiceDisplayName(voice: {
  provider?: string | null;
  providerMetadata?: unknown;
  voiceProfile?: string | null;
} | null | undefined): string | null {
  if (!voice) {
    return null;
  }
  const meta = parseStoryboardVoiceMetadata(voice.providerMetadata);
  if (meta.displayName?.trim()) {
    return meta.displayName.trim();
  }
  if (meta.fileName?.trim()) {
    return meta.fileName.trim();
  }
  return voice.voiceProfile?.trim() || null;
}
