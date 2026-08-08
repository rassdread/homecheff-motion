/**
 * SERVER_ONLY — Provider adapter contract (S.4).
 * Product code never calls provider SDKs; adapters encapsulate them.
 */

export type StudioProviderStartInput = {
  generationJobId: string;
  idempotencyKey: string;
  /** Opaque adapter input — never includes credit cost */
  payload: Record<string, unknown>;
};

export type StudioProviderStartResult = {
  providerJobId?: string;
  /** For sync adapters that return the product result immediately */
  syncResult?: {
    outputAssetId?: string;
    metadata?: Record<string, unknown>;
  };
};

export type StudioProviderStatusResult = {
  /** Provider-native status string (diagnostics) */
  providerStatus: string;
  /** Mapped Studio status — adapter responsibility */
  studioStatus:
    | "queued"
    | "starting"
    | "generating"
    | "processing"
    | "succeeded"
    | "failed"
    | "cancelled";
  progress?: number | null;
  errorCode?: string;
  errorMessageSafe?: string;
};

export type StudioProviderResult = {
  outputAssetId?: string;
  externalUrl?: string;
  metadata?: Record<string, unknown>;
};

export type StudioGenerationProviderAdapter = {
  id: string;
  supportsAsync: boolean;
  supportsCancellation: boolean;
  start(input: StudioProviderStartInput): Promise<StudioProviderStartResult>;
  getStatus?(providerJobId: string): Promise<StudioProviderStatusResult>;
  getResult?(providerJobId: string): Promise<StudioProviderResult>;
  cancel?(providerJobId: string): Promise<{ ok: boolean }>;
};
