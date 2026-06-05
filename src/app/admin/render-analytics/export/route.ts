import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/permissions";
import { getRenderAnalyticsReport } from "@/server/admin/render-analytics";
import {
  buildRenderAnalyticsCsv,
  RENDER_ANALYTICS_CSV_SECTIONS,
} from "@/server/admin/render-analytics-csv";
import type { RenderAnalyticsCsvSection } from "@/types/render-analytics";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** Admin page route — CSV export for render analytics. */
export async function GET(request: NextRequest) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) {
    return gate;
  }

  const section = request.nextUrl.searchParams.get("section") as RenderAnalyticsCsvSection | null;
  if (!section || !RENDER_ANALYTICS_CSV_SECTIONS.includes(section)) {
    return NextResponse.json(
      { ok: false, error: `Invalid section. Use: ${RENDER_ANALYTICS_CSV_SECTIONS.join(", ")}` },
      { status: 400 }
    );
  }

  try {
    const report = await getRenderAnalyticsReport();
    const { csv, filename } = buildRenderAnalyticsCsv(report, section);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "CSV export failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
