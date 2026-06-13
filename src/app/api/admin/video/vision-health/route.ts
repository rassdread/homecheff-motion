import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/permissions";
import { loadVisionHealthDashboard } from "@/server/admin/vision-health-dashboard";

export const dynamic = "force-dynamic";

/** Admin-only vision detector readiness (worker when VIDEO_RENDER_MODE=worker). */
export async function GET(request: Request) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) {
    return gate;
  }

  const probe = new URL(request.url).searchParams.get("probe") === "1";
  const dashboard = await loadVisionHealthDashboard(probe);
  return NextResponse.json(
    {
      ...dashboard.vision,
      dashboard,
      source: dashboard.source,
      workerReachable: dashboard.workerReachable,
      overlayEngine: dashboard.overlayEngine,
      editorMetrics: dashboard.editorMetrics,
      unifiedDetection: dashboard.unifiedDetection,
      activeFlags: dashboard.activeFlags,
      probeWarning: dashboard.probeWarning,
    },
    { status: dashboard.vision.ok ? 200 : 503 }
  );
}
