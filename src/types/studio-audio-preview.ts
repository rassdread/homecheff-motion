/**
 * Studio V2 — shared audio preview player sources (playback UX only).
 */

export type StudioAudioPreviewSource =
  | "voice_tts"
  | "voice_character"
  | "voice_clone"
  | "voice_clone_sample"
  | "narration_upload"
  | "music_upload"
  | "sfx_upload"
  | "mix_narration"
  | "mix_music"
  | "mix_sfx"
  | "subtitle_narration"
  | "motion_voice"
  | "voice_library";

export type StudioAudioPreviewPlayerProps = {
  title?: string;
  audioUrl: string | null | undefined;
  durationSeconds?: number | null;
  source: StudioAudioPreviewSource;
  variant?: "default" | "compact" | "inline";
  showDownload?: boolean;
  className?: string;
};
