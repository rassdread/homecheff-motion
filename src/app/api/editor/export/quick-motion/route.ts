import { NextResponse } from "next/server";
import { planQuickMotionExport } from "@/lib/editor-quick-gif";
import { renderEditorGif } from "@/server/editor/render-editor-export";
import { requireActiveUser } from "@/server/auth/permissions";
import type { EditorCanvasDocument, EditorQuickMotionConfig } from "@/types/homecheff-visual-editor";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  let body: { document?: EditorCanvasDocument; sessionId?: string; config?: Partial<EditorQuickMotionConfig> };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const document = body.document;
  if (!document?.sessionId || !document.backgroundUrl) {
    return NextResponse.json({ error: "document with sessionId and backgroundUrl is required." }, { status: 400 });
  }

  const job = planQuickMotionExport(document, body.config);
  try {
    const file = await renderEditorGif(document);
    return NextResponse.json({
      ok: true,
      job: { ...job, status: "ready" as const, downloadUrl: file.url },
      file,
      downloadUrl: file.url,
      status: "ready",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "GIF export failed.";
    return NextResponse.json(
      {
        ok: false,
        job: { ...job, status: "failed" as const, message },
        error: message,
        status: "failed",
      },
      { status: 502 }
    );
  }
}
