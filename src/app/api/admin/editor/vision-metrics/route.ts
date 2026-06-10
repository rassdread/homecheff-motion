import { NextResponse } from "next/server";
import { getEditorVisionMetricsSnapshot } from "@/lib/editor-vision-metrics";
import { buildSam2ProductionStatus } from "@/lib/editor-sam2-production";
import { auditSam2Availability } from "@/lib/editor-sam2-segmentation";
import { canAccessAdmin, requireActiveUser } from "@/server/auth/permissions";

export const runtime = "nodejs";

export async function GET() {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }
  if (!canAccessAdmin(user)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const sam2 = buildSam2ProductionStatus(auditSam2Availability());

  return NextResponse.json({
    ok: true,
    checkedAt: new Date().toISOString(),
    metrics: getEditorVisionMetricsSnapshot(),
    sam2: {
      health: sam2.health,
      endpointConfigured: sam2.endpointConfigured,
      averageLatencyMs: sam2.averageLatencyMs ?? null,
      recentFailureRate: sam2.recentFailureRate ?? null,
      lastHealthCheckAt: sam2.lastHealthCheckAt ?? null,
    },
  });
}
