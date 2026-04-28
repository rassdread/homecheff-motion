import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { maybeDeleteTransitionBlobVideosAfterFinalExport } from "@/server/animation-export/cleanup-generated-assets";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const EXTERNAL_EXPORT_PROVIDER = "external-ffmpeg";

function requireWorkerSecret(request: Request): boolean {
  const expected = process.env.MOTION_WORKER_SECRET?.trim();
  if (!expected) {
    return false;
  }
  const got = request.headers.get("x-motion-worker-secret")?.trim();
  return got === expected;
}

export async function POST(request: Request, context: RouteContext) {
  if (!requireWorkerSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectIdFromRoute } = await context.params;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const projectId = typeof body.projectId === "string" ? body.projectId.trim() : "";
  const exportId = typeof body.exportId === "string" ? body.exportId.trim() : "";
  const jobId = typeof body.jobId === "string" ? body.jobId.trim() : "";
  const statusRaw = typeof body.status === "string" ? body.status.trim().toLowerCase() : "";

  if (!projectId || projectId !== projectIdFromRoute) {
    return NextResponse.json({ error: "projectId mismatch" }, { status: 400 });
  }
  if (!exportId || !jobId) {
    return NextResponse.json({ error: "exportId and jobId required" }, { status: 400 });
  }
  if (statusRaw !== "completed" && statusRaw !== "failed") {
    return NextResponse.json({ error: "status must be completed or failed" }, { status: 400 });
  }

  const progress =
    typeof body.progress === "number" && Number.isFinite(body.progress)
      ? Math.min(100, Math.max(0, Math.round(body.progress)))
      : statusRaw === "completed"
        ? 100
        : 0;

  const outputVideoUrl =
    typeof body.outputVideoUrl === "string" && body.outputVideoUrl.trim()
      ? body.outputVideoUrl.trim()
      : null;
  const errorMessage =
    typeof body.errorMessage === "string" && body.errorMessage.trim()
      ? body.errorMessage.trim()
      : null;

  const exportRow = await prisma.animationExport.findFirst({
    where: { id: exportId, projectId },
  });

  if (!exportRow) {
    return NextResponse.json({ error: "Export not found" }, { status: 404 });
  }

  const storedJob = exportRow.providerJobId?.trim();
  if (storedJob && storedJob !== jobId) {
    console.info("[motion-export-callback]", {
      phase: "callback.stale_job_ignored",
      projectId,
      exportId,
      jobId,
      storedJob,
    });
    return NextResponse.json({ ok: true, ignored: true, reason: "stale_job" });
  }

  if (
    exportRow.provider != null &&
    exportRow.provider !== EXTERNAL_EXPORT_PROVIDER
  ) {
    console.info("[motion-export-callback]", {
      phase: "callback.provider_mismatch_ignored",
      projectId,
      exportId,
      provider: exportRow.provider,
    });
    return NextResponse.json({ ok: true, ignored: true, reason: "provider_mismatch" });
  }

  if (statusRaw === "completed" && !outputVideoUrl) {
    return NextResponse.json(
      { error: "completed status requires outputVideoUrl" },
      { status: 400 }
    );
  }

  if (statusRaw === "completed") {
    await prisma.animationExport.update({
      where: { id: exportId },
      data: {
        status: "completed",
        progress: 100,
        outputVideoUrl,
        errorMessage: null,
        provider: EXTERNAL_EXPORT_PROVIDER,
        providerJobId: jobId,
      },
    });
    await prisma.animationProject.update({
      where: { id: projectId },
      data: { status: "completed" },
    });
    await maybeDeleteTransitionBlobVideosAfterFinalExport(projectId).catch(() => undefined);
  } else {
    await prisma.animationExport.update({
      where: { id: exportId },
      data: {
        status: "failed",
        progress,
        outputVideoUrl: null,
        errorMessage: errorMessage ?? "Merge failed",
        provider: EXTERNAL_EXPORT_PROVIDER,
        providerJobId: jobId,
      },
    });
    await prisma.animationProject.update({
      where: { id: projectId },
      data: { status: "failed" },
    });
  }

  return NextResponse.json({ ok: true });
}
