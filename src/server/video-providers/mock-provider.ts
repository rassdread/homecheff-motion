import type {
  CreateStartEndVideoJobInput,
  CreateStartEndVideoJobResult,
  VideoJobStatusResult,
  VideoProvider,
} from "./types";

type MockVideoJob = {
  providerJobId: string;
  createdAtMs: number;
  transitionId: string;
};

const jobStore = new Map<string, MockVideoJob>();

/** `createStartEndVideoJob` encodes `Date.now()` at end of id — survives serverless cold/warm mismatch. */
function parseMockCreatedAtMs(providerJobId: string): number | null {
  if (!providerJobId.startsWith("mock-job-")) {
    return null;
  }
  const match = providerJobId.match(/-(\d{10,20})$/);
  if (!match) {
    return null;
  }
  const ts = Number(match[1]);
  return Number.isFinite(ts) ? ts : null;
}

function getElapsedMs(job: MockVideoJob): number {
  return Date.now() - job.createdAtMs;
}

function deriveStatus(job: MockVideoJob): VideoJobStatusResult {
  const elapsed = getElapsedMs(job);

  if (elapsed < 2_000) {
    return { status: "queued", progress: 5 };
  }

  if (elapsed < 11_000) {
    const progress = Math.min(95, Math.round((elapsed / 11_000) * 100));
    return { status: "generating", progress };
  }

  return {
    status: "completed",
    progress: 100,
    outputVideoUrl: `https://mock-videos.homecheff.local/${job.transitionId}.mp4`,
  };
}

export class MockVideoProvider implements VideoProvider {
  async createStartEndVideoJob(
    input: CreateStartEndVideoJobInput
  ): Promise<CreateStartEndVideoJobResult> {
    const providerJobId = `mock-job-${input.transitionId}-${Date.now()}`;

    jobStore.set(providerJobId, {
      providerJobId,
      createdAtMs: Date.now(),
      transitionId: input.transitionId,
    });

    return {
      providerJobId,
      status: "queued",
      providerKey: "mock",
    };
  }

  async getVideoJobStatus(providerJobId: string): Promise<VideoJobStatusResult> {
    const job = jobStore.get(providerJobId);

    if (!job) {
      const createdAtMs = parseMockCreatedAtMs(providerJobId);
      if (createdAtMs != null) {
        const synthetic: MockVideoJob = {
          providerJobId,
          createdAtMs,
          transitionId: "",
        };
        return deriveStatus(synthetic);
      }
      return {
        status: "failed",
        progress: 0,
        errorMessage: "Mock provider job not found.",
      };
    }

    return deriveStatus(job);
  }
}
