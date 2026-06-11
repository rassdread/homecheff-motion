import type { EditorSegmentClickJobStatus } from "@/types/editor-segment-click-job";

export function logEditorSegmentJob(input: {
  jobId: string;
  status: EditorSegmentClickJobStatus | string;
  provider?: string | null;
  elapsedMs?: number;
  finalResult?: string;
  prompt?: string;
  errorCode?: string;
}): void {
  console.info("[editor-segment-job]", {
    jobId: input.jobId,
    status: input.status,
    provider: input.provider ?? null,
    elapsedMs: input.elapsedMs ?? null,
    finalResult: input.finalResult ?? null,
    prompt: input.prompt ?? null,
    errorCode: input.errorCode ?? null,
  });
}
