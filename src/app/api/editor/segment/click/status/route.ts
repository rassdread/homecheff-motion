import { NextResponse } from "next/server";
import { segmentErrorHttpStatus } from "@/lib/editor-segmentation-errors";
import { requireActiveUser } from "@/server/auth/permissions";
import { getEditorSegmentClickJob } from "@/server/editor/editor-segment-click-job-store";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const jobId = new URL(request.url).searchParams.get("jobId")?.trim() ?? "";
  if (!jobId) {
    return NextResponse.json({ error: "jobId is required.", code: "invalid_job" }, { status: 400 });
  }

  const job = getEditorSegmentClickJob(jobId);
  if (!job) {
    return NextResponse.json({ error: "Job not found.", code: "job_not_found" }, { status: 404 });
  }

  if (job.userId !== user.id) {
    return NextResponse.json({ error: "Forbidden.", code: "forbidden" }, { status: 403 });
  }

  if (job.status === "ready") {
    return NextResponse.json({
      jobId: job.jobId,
      status: "ready",
      result: job.result,
      trace: job.trace,
    });
  }

  if (job.status === "failed" || job.status === "timeout") {
    const code = job.errorCode ?? "segmentation_internal_error";
    return NextResponse.json(
      {
        jobId: job.jobId,
        status: job.status,
        error: job.errorMessage,
        code,
        retryable: job.retryable ?? true,
        trace: job.trace,
      },
      { status: segmentErrorHttpStatus(code) }
    );
  }

  return NextResponse.json({
    jobId: job.jobId,
    status: job.status,
    prompt: job.prompt,
    trace: job.trace,
  });
}
