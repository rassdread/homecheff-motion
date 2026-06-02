import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/permissions";
import { getVisionSetupDiagnostics } from "@/server/animation-export/local-vision/vision-setup-validation";

export const dynamic = "force-dynamic";

/** Admin-only local vision detector readiness (MediaPipe + object detector). */
export async function GET(request: Request) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) {
    return gate;
  }

  const probe = new URL(request.url).searchParams.get("probe") === "1";
  const diagnostics = await getVisionSetupDiagnostics(probe);
  return NextResponse.json(diagnostics, { status: diagnostics.ok ? 200 : 503 });
}
