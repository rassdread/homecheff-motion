import { NextResponse } from "next/server";
import {
  buildBrandQaExportPayload,
  loadBrandQaAggregateReport,
} from "@/lib/brand-qa-analytics";
import { canAccessAdmin, requireActiveUser } from "@/server/auth/permissions";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }
  if (!canAccessAdmin(user)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format");

  const report = await loadBrandQaAggregateReport();

  if (format === "json") {
    const payload = buildBrandQaExportPayload(report);
    return NextResponse.json(payload, {
      status: 200,
      headers: {
        "Content-Disposition": `attachment; filename="brand-qa-export-${Date.now()}.json"`,
      },
    });
  }

  return NextResponse.json(
    {
      ok: true,
      checkedAt: new Date().toISOString(),
      report,
      exportUrl: "/api/admin/instant-premium/brand-qa-analytics?format=json",
    },
    { status: 200 }
  );
}
