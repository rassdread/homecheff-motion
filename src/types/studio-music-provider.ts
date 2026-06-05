/**
 * V35 future hooks — music generation providers (not integrated in V35).
 */

export type StudioMusicProviderId =
  | "suno"
  | "udio"
  | "stable_audio"
  | "elevenlabs_music"
  | "licensed_library"
  | "custom";

export type StudioMusicGenerationRequest = {
  storyboardId: string;
  profileId: string;
  sceneCueIds: string[];
  language?: string;
  /** Planned duration from voice timing or scene durations. */
  targetDurationSeconds: number;
};

export type StudioMusicGenerationResult = {
  providerId: StudioMusicProviderId;
  status: "not_implemented" | "queued" | "completed" | "failed";
  audioUrl?: string;
  message?: string;
};

/** Provider adapter surface for V35.5+. */
export interface StudioMusicProviderAdapter {
  id: StudioMusicProviderId;
  displayName: string;
  isConfigured(): boolean;
  generate(request: StudioMusicGenerationRequest): Promise<StudioMusicGenerationResult>;
}
