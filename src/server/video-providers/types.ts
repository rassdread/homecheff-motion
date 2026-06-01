export type VideoJobLifecycleStatus =
  | "queued"
  | "generating"
  | "completed"
  | "failed";

export type CreateStartEndVideoJobInput = {
  transitionId: string;
  /** Present when the job is tied to a persisted animation project */
  projectId?: string;
  startImageUrl: string;
  endImageUrl: string;
  prompt: string;
  durationSeconds: number;
  aspectRatio: string;
  stylePreset: string;
  /** When set, Vidu uses these instead of env (still validated server-side). Mock ignores. */
  providerModel?: string;
  providerResolution?: string;
  providerDurationSeconds?: number;
};

export type CreateStartEndVideoJobResult = {
  providerJobId: string;
  status: VideoJobLifecycleStatus;
  /** Persisted on `AnimationTransition.provider` (e.g. `mock`, `vidu`) */
  providerKey?: string;
};

export type VideoJobStatusResult = {
  status: VideoJobLifecycleStatus;
  outputVideoUrl?: string;
  progress: number;
  errorMessage?: string;
};

export type MultiFrameSegmentInput = {
  keyImageUrl: string;
  prompt?: string;
  durationSeconds: number;
};

export type CreateMultiImageVideoJobInput = {
  transitionId: string;
  projectId?: string;
  startImageUrl: string;
  segments: MultiFrameSegmentInput[];
  prompt: string;
  aspectRatio: string;
  providerModel?: string;
  providerResolution?: string;
};

export interface VideoProvider {
  createStartEndVideoJob(
    input: CreateStartEndVideoJobInput
  ): Promise<CreateStartEndVideoJobResult>;
  createMultiImageVideoJob?(
    input: CreateMultiImageVideoJobInput
  ): Promise<CreateStartEndVideoJobResult>;
  getVideoJobStatus(providerJobId: string): Promise<VideoJobStatusResult>;
}
