import { NextResponse } from "next/server";
import { buildProductionReadyExportBundle } from "@/lib/editor-production-export";
import { requireActiveUser } from "@/server/auth/permissions";
import type { ProductionOutputProfileId } from "@/lib/production-output-profiles";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  let body: { document?: EditorCanvasDocument; outputProfile?: ProductionOutputProfileId };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.document?.sessionId) {
    return NextResponse.json({ error: "document with sessionId is required." }, { status: 400 });
  }

  const bundle = buildProductionReadyExportBundle(body.document, body.outputProfile ?? "web_ready");
  return NextResponse.json({ ok: true, bundle });
}
