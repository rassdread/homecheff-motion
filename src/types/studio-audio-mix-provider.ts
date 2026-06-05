/**
 * V37 future hooks — automatic mixing / mastering (not integrated in V37).
 */

export type StudioAudioMixProviderId =
  | "ffmpeg_ducking"
  | "loudness_normalize"
  | "auto_balance"
  | "mastering_chain"
  | "custom";

export type StudioAudioMixRequest = {
  storyboardId: string;
  sceneCueIds: string[];
  targetLoudnessLufs?: number;
};

export type StudioAudioMixResult = {
  providerId: StudioAudioMixProviderId;
  status: "not_implemented" | "queued" | "completed" | "failed";
  audioUrl?: string;
  message?: string;
};

export interface StudioAudioMixProviderAdapter {
  id: StudioAudioMixProviderId;
  displayName: string;
  isConfigured(): boolean;
  mix(request: StudioAudioMixRequest): Promise<StudioAudioMixResult>;
}
