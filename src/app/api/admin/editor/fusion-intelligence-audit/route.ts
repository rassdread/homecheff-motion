import { NextResponse } from "next/server";
import {
  buildFusionIntelligenceAuditReport,
  buildFusionIntelligenceDiagnosticExport,
} from "@/lib/fusion-intelligence-audit";
import { canAccessAdmin, requireActiveUser } from "@/server/auth/permissions";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }
  if (!canAccessAdmin(user)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    document?: EditorCanvasDocument;
    format?: string;
  };

  if (!body.document) {
    return NextResponse.json({ error: "document required" }, { status: 400 });
  }

  const report = buildFusionIntelligenceAuditReport({ document: body.document });
  const diagnostic = buildFusionIntelligenceDiagnosticExport(report);

  if (body.format === "json") {
    return NextResponse.json(diagnostic, {
      status: 200,
      headers: {
        "Content-Disposition": `attachment; filename="fusion-intelligence-audit-${Date.now()}.json"`,
      },
    });
  }

  return NextResponse.json({
    ok: true,
    checkedAt: new Date().toISOString(),
    report,
    diagnostic,
  });
}
