/**
 * SERVER_ONLY — Fake provider for S.4 harness / CI (no external cost).
 */

import type {
  StudioGenerationProviderAdapter,
  StudioProviderStartInput,
  StudioProviderStartResult,
  StudioProviderStatusResult,
  StudioProviderResult,
} from "@/server/studio-generation/provider-adapter";

type FakeMode = "success" | "async_success" | "failure" | "timeout";

const asyncJobs = new Map<
  string,
  { mode: FakeMode; createdAt: number; doneAt: number }
>();

export function createFakeProviderAdapter(mode: FakeMode = "success"): StudioGenerationProviderAdapter {
  return {
    id: "fake",
    supportsAsync: mode === "async_success",
    supportsCancellation: true,
    async start(input: StudioProviderStartInput): Promise<StudioProviderStartResult> {
      if (mode === "failure") {
        throw new Error("FAKE_PROVIDER_REJECTED");
      }
      if (mode === "timeout") {
        throw new Error("FAKE_PROVIDER_TIMEOUT");
      }
      if (mode === "async_success") {
        const providerJobId = `fake_${input.generationJobId}`;
        asyncJobs.set(providerJobId, {
          mode,
          createdAt: Date.now(),
          doneAt: Date.now() + 50,
        });
        return { providerJobId };
      }
      return {
        syncResult: {
          outputAssetId: `fake_asset_${input.generationJobId}`,
          metadata: { adapter: "fake", idempotencyKey: input.idempotencyKey },
        },
      };
    },
    async getStatus(providerJobId: string): Promise<StudioProviderStatusResult> {
      const row = asyncJobs.get(providerJobId);
      if (!row) {
        return {
          providerStatus: "unknown",
          studioStatus: "failed",
          errorCode: "PROVIDER_UNAVAILABLE",
          errorMessageSafe: "Unknown fake job.",
        };
      }
      if (Date.now() < row.doneAt) {
        return { providerStatus: "in_progress", studioStatus: "generating", progress: null };
      }
      return { providerStatus: "completed", studioStatus: "succeeded", progress: null };
    },
    async getResult(providerJobId: string): Promise<StudioProviderResult> {
      return {
        outputAssetId: `fake_asset_${providerJobId}`,
        metadata: { adapter: "fake" },
      };
    },
    async cancel(providerJobId: string) {
      asyncJobs.delete(providerJobId);
      return { ok: true };
    },
  };
}
