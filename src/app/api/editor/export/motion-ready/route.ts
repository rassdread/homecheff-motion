import { NextResponse } from "next/server";
import { buildMotionReadyExportBundle } from "@/lib/editor-motion-ready-export";
import { renderMotionReadyManifest } from "@/server/editor/render-editor-export";
import { requireActiveUser } from "@/server/auth/permissions";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  let body: { document?: EditorCanvasDocument };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.document?.sessionId) {
    return NextResponse.json({ error: "document with sessionId is required." }, { status: 400 });
  }

  const bundle = buildMotionReadyExportBundle(body.document);
  try {
    const rendered = await renderMotionReadyManifest(body.document);
    return NextResponse.json({
      ok: true,
      bundle,
      manifestUrl: rendered.manifestUrl,
      files: rendered.files,
      cutoutUrls: rendered.cutoutUrls,
      downloadUrl: rendered.manifestUrl,
      status: "ready",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Motion export failed.";
    return NextResponse.json({ ok: false, bundle, error: message, status: "failed" }, { status: 502 });
  }
}
