/**
 * Studio V41 — universal Provider Execution Framework (planning only, no live integrations).
 */

export type StudioProviderType = "voice" | "music" | "sound" | "image" | "video";

export type StudioProviderStatus =
  | "available"
  | "planned"
  | "disabled"
  | "not_configured";

export type StudioProviderId =
  | "elevenlabs"
  | "openai_voice"
  | "azure_voice"
  | "suno"
  | "udio"
  | "freesound"
  | "artlist"
  | "openai_images"
  | "vidu"
  | "kling"
  | "runway"
  | "mock";

export type StudioProvider = {
  id: StudioProviderId;
  name: string;
  providerType: StudioProviderType;
  enabled: boolean;
  priority: number;
  status: StudioProviderStatus;
  /** Typical latency bucket in seconds (planning estimate). */
  latencySeconds: number;
  supportsFallback: boolean;
  costTrackingEnabled: boolean;
  metadata?: Record<string, string | number | boolean>;
};

export type StudioProviderJobState =
  | "pending"
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export type StudioProviderJob = {
  id: string;
  providerId: StudioProviderId;
  providerType: StudioProviderType;
  state: StudioProviderJobState;
  storyboardId: string;
  assetType: StudioProviderType;
  createdAt: string;
  updatedAt: string;
  externalJobId?: string | null;
  estimatedCostCredits?: number | null;
  errorMessage?: string | null;
};

export type ProviderCostEstimate = {
  providerId: StudioProviderId;
  providerType: StudioProviderType;
  estimatedCredits: number;
  estimatedCostEur: number;
  estimatedDurationSeconds: number;
};

export type ProviderCapability = {
  providerId: StudioProviderId;
  languages: string[];
  voiceSupport: boolean;
  musicSupport: boolean;
  soundSupport: boolean;
  videoSupport: boolean;
  imageSupport: boolean;
};

export type ProviderAssignmentInput = {
  assetType: StudioProviderType;
  language?: string;
  costProfile?: "economy" | "balanced" | "quality";
  qualityProfile?: "draft" | "standard" | "premium";
};

export type ProviderAssignment = {
  assetType: StudioProviderType;
  selectedProviderId: StudioProviderId;
  selectedProviderName: string;
  fallbackProviderId: StudioProviderId | null;
  reasonKey: string;
};

export type ProviderFallbackStep = {
  fromProviderId: StudioProviderId;
  toProviderId: StudioProviderId;
  assetType: StudioProviderType;
  automatic: false;
};

export type ProviderFallbackPlan = {
  enabled: boolean;
  steps: ProviderFallbackStep[];
};

export type ProviderExecutionWarning = {
  code: string;
  severity: "info" | "warning";
  messageKey: string;
  params?: Record<string, string | number>;
};

export type ProviderExecutionPlan = {
  enabled: boolean;
  version: 41;
  voiceProvider: StudioProviderId;
  musicProvider: StudioProviderId;
  soundProvider: StudioProviderId;
  imageProvider: StudioProviderId;
  videoProvider: StudioProviderId;
  assignments: ProviderAssignment[];
  estimatedCost: ProviderCostEstimate[];
  estimatedTotalCredits: number;
  estimatedTotalCostEur: number;
  estimatedLatencySeconds: number;
  executionWarnings: ProviderExecutionWarning[];
  fallbackPlan: ProviderFallbackPlan;
  capabilities: ProviderCapability[];
};

export type MotionProviderExecutionHandoffPlan = Pick<
  ProviderExecutionPlan,
  | "enabled"
  | "voiceProvider"
  | "musicProvider"
  | "soundProvider"
  | "imageProvider"
  | "videoProvider"
  | "estimatedTotalCredits"
  | "estimatedTotalCostEur"
  | "estimatedLatencySeconds"
  | "executionWarnings"
> & {
  providerAssignments: ProviderAssignment[];
  providerFallbackPlan: ProviderFallbackPlan;
  providerCapabilities: ProviderCapability[];
  providerCostEstimate: ProviderCostEstimate[];
  providerWarnings: ProviderExecutionWarning[];
};
