import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/permissions";
import { fetchWorkerVisionHealth } from "@/lib/video-worker-client";
import { isVideoRenderWorkerMode } from "@/lib/video-render-mode";
import {
  getOverlayEngineReadiness,
  getOverlayEngineStatus,
} from "@/server/animation-export/overlay-engine-status";
import { getVisionSetupDiagnostics } from "@/server/animation-export/local-vision/vision-setup-validation";
import { resolveObjectDetectorModelPath } from "@/server/animation-export/local-vision/object-detector-model-paths";

export const dynamic = "force-dynamic";

/** Admin-only overlay engine readiness (safe zones, placement, timing, vision). */
export async function GET(request: Request) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) {
    return gate;
  }

  const probe = new URL(request.url).searchParams.get("probe") === "1";
  let status;
  if (isVideoRenderWorkerMode()) {
    const workerVision = await fetchWorkerVisionHealth(probe);
    if (workerVision) {
      status = getOverlayEngineStatus(workerVision);
      status.vision = workerVision;
      const modelPath = await resolveObjectDetectorModelPath().catch(() => "");
      status.env.HC_OBJECT_DETECTOR_MODEL_PATH =
        workerVision.objectDetector.modelPath || modelPath || status.env.HC_OBJECT_DETECTOR_MODEL_PATH;
      status = { ...status, source: "video-worker" as const };
    }
  }
  if (!status) {
    status = { ...(await getOverlayEngineReadiness(probe)), source: "app-process" as const };
  }
  const httpOk = status.readinessScore >= 50;
  return NextResponse.json(status, { status: httpOk ? 200 : 503 });
}
