/**
 * Studio V2 — audio preview source labels (i18n keys only).
 */

import type { TranslationKey } from "@/i18n";
import type { StudioAudioPreviewSource } from "@/types/studio-audio-preview";

const SOURCE_LABEL_KEYS: Record<StudioAudioPreviewSource, TranslationKey> = {
  voice_tts: "studio.audioPreview.source.voiceTts",
  voice_character: "studio.audioPreview.source.voiceCharacter",
  voice_clone: "studio.audioPreview.source.voiceClone",
  voice_clone_sample: "studio.audioPreview.source.voiceCloneSample",
  narration_upload: "studio.audioPreview.source.narrationUpload",
  music_upload: "studio.audioPreview.source.musicUpload",
  sfx_upload: "studio.audioPreview.source.sfxUpload",
  mix_narration: "studio.audioPreview.source.mixNarration",
  mix_music: "studio.audioPreview.source.mixMusic",
  mix_sfx: "studio.audioPreview.source.mixSfx",
  subtitle_narration: "studio.audioPreview.source.subtitleNarration",
  motion_voice: "studio.audioPreview.source.motionVoice",
};

export function audioPreviewSourceLabelKey(source: StudioAudioPreviewSource): TranslationKey {
  return SOURCE_LABEL_KEYS[source];
}

export function isAudioPreviewPlayable(audioUrl: string | null | undefined): boolean {
  return Boolean(audioUrl?.trim());
}
