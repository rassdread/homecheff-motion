/**
 * V36 future hooks — sound effects providers (not integrated in V36).
 */

export type StudioSoundProviderId =
  | "freesound"
  | "epidemic"
  | "artlist"
  | "soundly"
  | "elevenlabs_sfx"
  | "homecheff_library"
  | "custom";

export type StudioSoundGenerationRequest = {
  storyboardId: string;
  profileId: string;
  sceneCueIds: string[];
  targetDurationSeconds: number;
};

export type StudioSoundGenerationResult = {
  providerId: StudioSoundProviderId;
  status: "not_implemented" | "queued" | "completed" | "failed";
  audioUrl?: string;
  message?: string;
};

/** Provider adapter surface for V36.5+. */
export interface StudioSoundProviderAdapter {
  id: StudioSoundProviderId;
  displayName: string;
  isConfigured(): boolean;
  generate(request: StudioSoundGenerationRequest): Promise<StudioSoundGenerationResult>;
}
