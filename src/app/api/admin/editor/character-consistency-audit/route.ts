import { NextResponse } from "next/server";
import { buildCharacterConsistencyAuditReport } from "@/lib/character-consistency-audit";
import { buildCharacterConsistencyDiagnosticExport } from "@/lib/character-consistency-score";
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

  const report = buildCharacterConsistencyAuditReport({ document: body.document });
  const diagnostic = buildCharacterConsistencyDiagnosticExport(report.score);

  if (body.format === "json") {
    return NextResponse.json(diagnostic, {
      status: 200,
      headers: {
        "Content-Disposition": `attachment; filename="character-consistency-audit-${Date.now()}.json"`,
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
