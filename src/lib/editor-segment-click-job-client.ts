import type { EditorSegmentClickJobResult } from "@/types/editor-segment-click-job";

export const EDITOR_SEGMENT_JOB_POLL_MS = 1_800;
export const EDITOR_SEGMENT_JOB_MAX_WAIT_MS = 90_000;
export const EDITOR_SEGMENT_JOB_COLD_START_MS = 6_000;

export type EditorSegmentClickJobPollStatus = {
  jobId: string;
  status: "queued" | "running" | "ready" | "failed" | "timeout";
  result?: EditorSegmentClickJobResult;
  code?: string;
  error?: string;
  retryable?: boolean;
  prompt?: string;
};

export type StartEditorSegmentClickJobResult =
  | { ok: true; jobId: string; editorObjectId: string }
  | { ok: false; code?: string; message?: string };

export async function startEditorSegmentClickJob(
  body: Record<string, unknown>
): Promise<StartEditorSegmentClickJobResult> {
  const res = await fetch("/api/editor/segment/click/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { code?: string; error?: string } | null;
    return { ok: false, code: err?.code, message: err?.error };
  }
  const data = (await res.json()) as { jobId: string; editorObjectId: string };
  return { ok: true, jobId: data.jobId, editorObjectId: data.editorObjectId };
}

export async function fetchEditorSegmentClickJobStatus(
  jobId: string
): Promise<EditorSegmentClickJobPollStatus | null> {
  const res = await fetch(
    `/api/editor/segment/click/status?jobId=${encodeURIComponent(jobId)}`,
    { cache: "no-store" }
  );
  if (res.status === 404) {
    return null;
  }
  return (await res.json()) as EditorSegmentClickJobPollStatus;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type PollEditorSegmentClickJobResult =
  | { ok: true; result: EditorSegmentClickJobResult }
  | { ok: false; code?: string; message?: string; retryable?: boolean; timedOut?: boolean };

export async function pollEditorSegmentClickJob(
  jobId: string,
  options?: {
    onStatus?: (status: EditorSegmentClickJobPollStatus, elapsedMs: number) => void;
  }
): Promise<PollEditorSegmentClickJobResult> {
  const started = Date.now();
  while (Date.now() - started < EDITOR_SEGMENT_JOB_MAX_WAIT_MS) {
    const status = await fetchEditorSegmentClickJobStatus(jobId);
    if (!status) {
      return { ok: false, code: "job_not_found", message: "Segmentation job not found." };
    }
    options?.onStatus?.(status, Date.now() - started);
    if (status.status === "ready" && status.result) {
      return { ok: true, result: status.result };
    }
    if (status.status === "failed" || status.status === "timeout") {
      return {
        ok: false,
        code: status.code,
        message: status.error,
        retryable: status.retryable ?? true,
      };
    }
    await sleep(EDITOR_SEGMENT_JOB_POLL_MS);
  }
  return {
    ok: false,
    code: "replicate_timeout",
    message: "Segmentation timed out on client.",
    retryable: true,
    timedOut: true,
  };
}
