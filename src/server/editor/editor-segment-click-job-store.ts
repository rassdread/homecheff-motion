import type {
  EditorSegmentClickJob,
  EditorSegmentClickJobCreateInput,
  EditorSegmentClickJobResult,
  EditorSegmentClickJobStatus,
  EditorSegmentClickJobTrace,
} from "@/types/editor-segment-click-job";
import type { EditorSegmentErrorCode } from "@/lib/editor-segmentation-errors";

const JOB_TTL_MS = 2 * 60 * 60 * 1000;

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
  return updateEditorSegmentClickJob(jobId, { status: "ready", result, trace, retryable: false });
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
  return updateEditorSegmentClickJob(jobId, {
    status: input.status,
    errorCode: input.errorCode,
    errorMessage: input.errorMessage,
    retryable: input.retryable,
    trace: input.trace,
  });
}
