import { NextResponse } from "next/server";
import { buildProductionReadyExportBundle } from "@/lib/editor-production-export";
import { renderEditorProductionFiles } from "@/server/editor/render-editor-export";
import { requireActiveUser } from "@/server/auth/permissions";
import type { ProductionOutputProfileId } from "@/lib/production-output-profiles";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  let body: { document?: EditorCanvasDocument; outputProfile?: ProductionOutputProfileId; formats?: Array<"png" | "jpg" | "webp"> };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.document?.sessionId || !body.document.backgroundUrl) {
    return NextResponse.json({ error: "document with sessionId and backgroundUrl is required." }, { status: 400 });
  }

  const bundle = buildProductionReadyExportBundle(body.document, body.outputProfile ?? "web_ready");
  try {
    const files = await renderEditorProductionFiles(body.document, body.formats ?? ["png", "jpg", "webp"]);
    const primary = files[0];
    return NextResponse.json({
      ok: true,
      bundle,
      files,
      downloadUrl: primary?.url,
      status: "ready",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Export render failed.";
    return NextResponse.json({ ok: false, bundle, error: message, status: "failed" }, { status: 502 });
  }
}
