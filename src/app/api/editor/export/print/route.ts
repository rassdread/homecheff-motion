import { NextResponse } from "next/server";
import { assessPosterUpscaleNeeds } from "@/lib/editor-poster-upscale";
import { buildPrintReadyExportBundle } from "@/lib/editor-print-export";
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

  if (!body.document?.sessionId) {
    return NextResponse.json({ error: "document with sessionId is required." }, { status: 400 });
  }

  const bundle = buildPrintReadyExportBundle(body.document);
  const upscale = assessPosterUpscaleNeeds(
    body.document,
    body.sourceWidth ?? 1920,
    body.sourceHeight ?? 1080
  );

  return NextResponse.json({ ok: true, bundle, upscale });
}
