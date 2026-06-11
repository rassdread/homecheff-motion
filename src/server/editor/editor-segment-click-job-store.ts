import type {
  EditorSegmentClickJob,
  EditorSegmentClickJobCreateInput,
  EditorSegmentClickJobResult,
  EditorSegmentClickJobStatus,
  EditorSegmentClickJobTrace,
} from "@/types/editor-segment-click-job";
import type { EditorSegmentErrorCode } from "@/lib/editor-segmentation-errors";
import { EDITOR_JOB_CLICK_DEADLINE_MS } from "@/server/editor/replicate-sam3-editor-segment";
import { logEditorSegmentJob } from "@/server/editor/editor-segment-click-job-log";

const JOB_TTL_MS = 2 * 60 * 60 * 1000;
const JOB_STALE_MS = EDITOR_JOB_CLICK_DEADLINE_MS + 15_000;

type GlobalJobStore = {
  editorSegmentClickJobs?: Map<string, EditorSegmentClickJob>;
};

function jobMap(): Map<string, EditorSegmentClickJob> {
  const g = globalThis as GlobalJobStore;
  if (!g.editorSegmentClickJobs) {
    g.editorSegmentClickJobs = new Map();
  }
  return g.editorSegmentClickJobs;
}

function pruneExpiredJobs(): void {
  const map = jobMap();
  const now = Date.now();
  for (const [id, job] of map.entries()) {
    if (now - job.updatedAt > JOB_TTL_MS) {
      map.delete(id);
    }
  }
}

export function createEditorSegmentClickJob(
  input: EditorSegmentClickJobCreateInput
): EditorSegmentClickJob {
  pruneExpiredJobs();
  const now = Date.now();
  const job: EditorSegmentClickJob = {
    jobId: crypto.randomUUID(),
    userId: input.userId,
    sessionId: input.sessionId,
    prompt: input.prompt,
    imageUrl: input.imageUrl,
    clickPoint: input.clickPoint,
    parentLayerId: input.parentLayerId,
    editorObjectId: input.editorObjectId,
    targetBounds: input.targetBounds,
    backgroundStorageKey: input.backgroundStorageKey,
    createCutout: input.createCutout !== false,
    status: "queued",
    createdAt: now,
    updatedAt: now,
  };
  jobMap().set(job.jobId, job);
  return job;
}

export function getEditorSegmentClickJob(jobId: string): EditorSegmentClickJob | null {
  const job = jobMap().get(jobId);
  if (!job) {
    return null;
  }
  if (Date.now() - job.updatedAt > JOB_TTL_MS) {
    jobMap().delete(jobId);
    return null;
  }
  return job;
}

export function updateEditorSegmentClickJob(
  jobId: string,
  patch: Partial<
    Pick<
      EditorSegmentClickJob,
      | "status"
      | "result"
      | "errorCode"
      | "errorMessage"
      | "retryable"
      | "trace"
    >
  >
): EditorSegmentClickJob | null {
  const job = getEditorSegmentClickJob(jobId);
  if (!job) {
    return null;
  }
  const next: EditorSegmentClickJob = {
    ...job,
    ...patch,
    updatedAt: Date.now(),
  };
  jobMap().set(jobId, next);
  return next;
}

export function markEditorSegmentClickJobRunning(jobId: string): EditorSegmentClickJob | null {
  return updateEditorSegmentClickJob(jobId, { status: "running" });
}

export function markEditorSegmentClickJobReady(
  jobId: string,
  result: EditorSegmentClickJobResult,
  trace?: EditorSegmentClickJobTrace
): EditorSegmentClickJob | null {
  const updated = updateEditorSegmentClickJob(jobId, { status: "ready", result, trace, retryable: false });
  if (updated) {
    logEditorSegmentJob({
      jobId,
      status: "ready",
      provider: result.providerUsed ?? result.segmentationSource ?? null,
      elapsedMs: trace?.totalMs ?? Date.now() - updated.createdAt,
      finalResult: result.maskUrl ? "mask_ready" : "no_mask",
      prompt: updated.prompt,
    });
  }
  return updated;
}

export function markEditorSegmentClickJobFailed(
  jobId: string,
  input: {
    status: "failed" | "timeout";
    errorCode: EditorSegmentErrorCode;
    errorMessage: string;
    retryable: boolean;
    trace?: EditorSegmentClickJobTrace;
  }
): EditorSegmentClickJob | null {
  const updated = updateEditorSegmentClickJob(jobId, {
    status: input.status,
    errorCode: input.errorCode,
    errorMessage: input.errorMessage,
    retryable: input.retryable,
    trace: input.trace,
  });
  if (updated) {
    logEditorSegmentJob({
      jobId,
      status: input.status,
      elapsedMs: input.trace?.totalMs ?? Date.now() - updated.createdAt,
      finalResult: input.status,
      errorCode: input.errorCode,
      prompt: updated.prompt,
    });
  }
  return updated;
}

/** Ensure in-flight jobs cannot remain queued/running forever (serverless after() miss). */
export function resolveStaleEditorSegmentClickJob(jobId: string): EditorSegmentClickJob | null {
  const job = getEditorSegmentClickJob(jobId);
  if (!job) {
    return null;
  }
  if (job.status !== "queued" && job.status !== "running") {
    return job;
  }
  const elapsedMs = Date.now() - job.createdAt;
  if (elapsedMs <= JOB_STALE_MS) {
    return job;
  }
  return markEditorSegmentClickJobFailed(jobId, {
    status: "timeout",
    errorCode: "replicate_timeout",
    errorMessage: "Segmentation job timed out.",
    retryable: true,
    trace: { totalMs: elapsedMs },
  });
}
