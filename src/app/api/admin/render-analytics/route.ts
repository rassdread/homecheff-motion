import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/permissions";
import { getRenderAnalyticsReport } from "@/server/admin/render-analytics";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** Admin API — refresh render analytics JSON (used by dashboard refresh button). */
export async function GET() {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) {
    return gate;
  }

  try {
    const report = await getRenderAnalyticsReport();
    return NextResponse.json({ ok: true, report });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Render analytics failed";
    console.error("[api/admin/render-analytics]", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
