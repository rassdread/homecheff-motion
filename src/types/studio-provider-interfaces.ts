/**
 * Studio V41 — future provider execution interfaces (no API calls, no credentials).
 */

import type {
  StudioProviderId,
  StudioProviderJob,
  StudioProviderJobState,
} from "@/types/studio-provider-execution";

export type StudioProviderExecutionRequest = {
  storyboardId: string;
  sceneIds?: string[];
  language?: string;
  targetDurationSeconds?: number;
};

export type StudioProviderExecutionResult = {
  providerId: StudioProviderId;
  status: StudioProviderJobState | "not_implemented";
  jobId?: string;
  outputUrl?: string;
  message?: string;
};

/** Universal provider execution surface for V41+. */
export interface StudioProviderExecutor {
  id: StudioProviderId;
  displayName: string;
  isConfigured(): boolean;
  estimateCost(request: StudioProviderExecutionRequest): Promise<{
    estimatedCredits: number;
    estimatedCostEur: number;
    estimatedDurationSeconds: number;
  }>;
  createJob(request: StudioProviderExecutionRequest): Promise<StudioProviderExecutionResult>;
  pollJob(jobId: string): Promise<StudioProviderJob>;
  cancelJob(jobId: string): Promise<{ ok: boolean }>;
}

export interface ElevenLabsVoiceExecutor extends StudioProviderExecutor {
  id: "elevenlabs";
}

export interface OpenAiVoiceExecutor extends StudioProviderExecutor {
  id: "openai_voice";
}

export interface AzureVoiceExecutor extends StudioProviderExecutor {
  id: "azure_voice";
}

export interface SunoMusicExecutor extends StudioProviderExecutor {
  id: "suno";
}

export interface UdioMusicExecutor extends StudioProviderExecutor {
  id: "udio";
}

export interface FreesoundSfxExecutor extends StudioProviderExecutor {
  id: "freesound";
}

export interface ArtlistSfxExecutor extends StudioProviderExecutor {
  id: "artlist";
}

export interface OpenAiImageExecutor extends StudioProviderExecutor {
  id: "openai_images";
}

export interface ViduVideoExecutor extends StudioProviderExecutor {
  id: "vidu";
}

export interface KlingVideoExecutor extends StudioProviderExecutor {
  id: "kling";
}

export interface RunwayVideoExecutor extends StudioProviderExecutor {
  id: "runway";
}
