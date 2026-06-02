import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/permissions";
import { fetchWorkerVisionHealth } from "@/lib/video-worker-client";
import { isVideoRenderWorkerMode } from "@/lib/video-render-mode";
import { getVisionSetupDiagnostics } from "@/server/animation-export/local-vision/vision-setup-validation";

export const dynamic = "force-dynamic";

/** Admin-only vision detector readiness (worker when VIDEO_RENDER_MODE=worker). */
export async function GET(request: Request) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) {
    return gate;
  }

  const probe = new URL(request.url).searchParams.get("probe") === "1";
  if (isVideoRenderWorkerMode()) {
    const workerVision = await fetchWorkerVisionHealth(probe);
    if (workerVision) {
      return NextResponse.json(
        { ...workerVision, source: "video-worker" as const },
        { status: workerVision.ok ? 200 : 503 }
      );
    }
  }

  const diagnostics = await getVisionSetupDiagnostics(probe);
  return NextResponse.json(
    { ...diagnostics, source: "app-process" as const },
    { status: diagnostics.ok ? 200 : 503 }
  );
}
