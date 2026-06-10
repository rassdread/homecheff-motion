import { NextResponse } from "next/server";
import { segmentationProviderAvailable } from "@/lib/premium-foreground-segmentation";
import { requireActiveUser } from "@/server/auth/permissions";
import { getSam2ServiceStatus } from "@/server/editor/sam2-click-segment";

export const runtime = "nodejs";

export async function GET() {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const status = getSam2ServiceStatus();
  return NextResponse.json({
    sam2PreciseSelection: status.available ? "available" : "unavailable",
    endpointConfigured: status.endpointConfigured,
    reason: status.reason ?? null,
    rembgAvailable: segmentationProviderAvailable("rembg"),
    fallbacks: status.fallbacks,
  });
}
