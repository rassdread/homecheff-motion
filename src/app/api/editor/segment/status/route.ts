import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { getSam2ServiceStatus } from "@/server/editor/sam2-click-segment";
import { getEditorSegmentationProviderStatus } from "@/server/editor/editor-segmentation-provider";

export const runtime = "nodejs";

export async function GET() {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const status = getSam2ServiceStatus();
  const providers = getEditorSegmentationProviderStatus();

  return NextResponse.json({
    sam2PreciseSelection: status.available ? "available" : "unavailable",
    sam2Health: status.health,
    endpointConfigured: status.endpointConfigured,
    reason: status.reason ?? null,
    averageLatencyMs: status.averageLatencyMs ?? null,
    recentFailureRate: status.recentFailureRate ?? null,
    lastHealthCheckAt: status.lastHealthCheckAt ?? null,
    rembgAvailable: providers.rembg,
    replicateConfigured: providers.replicate,
    replicateSam3Available: providers.replicate,
    primarySegmentProvider: providers.primary,
    autoMaskProviderAvailable: providers.primary !== "none",
    providerPriority: ["replicate_sam3", "sam2", "rembg", "heuristic"],
    fallbacks: status.fallbacks,
  });
}
