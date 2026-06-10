import { NextResponse } from "next/server";
import { buildPrintReadyExportBundle } from "@/lib/editor-print-export";
import { assessPosterUpscaleNeeds } from "@/lib/editor-poster-upscale";
import { renderEditorPrintPng } from "@/server/editor/render-editor-export";
import { requireActiveUser } from "@/server/auth/permissions";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  let body: { document?: EditorCanvasDocument; sourceWidth?: number; sourceHeight?: number };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.document?.sessionId || !body.document.backgroundUrl) {
    return NextResponse.json({ error: "document with sessionId and backgroundUrl is required." }, { status: 400 });
  }

  const bundle = buildPrintReadyExportBundle(body.document);
  const upscale = assessPosterUpscaleNeeds(
    body.document,
    body.sourceWidth ?? 1920,
    body.sourceHeight ?? 1080
  );

  try {
    const file = await renderEditorPrintPng(body.document);
    return NextResponse.json({
      ok: true,
      bundle,
      upscale,
      files: [file],
      downloadUrl: file.url,
      status: "ready",
      pdfNote: "PDF export uses print-ready PNG — open in design tool for PDF.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Print export failed.";
    return NextResponse.json({ ok: false, bundle, upscale, error: message, status: "failed" }, { status: 502 });
  }
}
