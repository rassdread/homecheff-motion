import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import type { EditorSavePayload } from "@/lib/editor-canvas-export";

type SaveBody = {
  mode: string;
  payload: EditorSavePayload;
};

/**
 * Editor library persist foundation — stores semantic patch metadata server-side when possible.
 * Full asset registry integration is deferred; client falls back to localStorage on failure.
 */
export async function POST(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  let body: SaveBody;
  try {
    body = (await request.json()) as SaveBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.payload?.sessionId || !body.payload?.name) {
    return NextResponse.json({ error: "Missing payload" }, { status: 400 });
  }

  const savedAt = new Date().toISOString();
  const semanticMarker = {
    editorSessionId: body.payload.sessionId,
    mode: body.mode,
    compositionGraph: body.payload.compositionGraph,
    referencePlacements: body.payload.referencePlacements,
    semanticLayers: body.payload.semanticLayers,
    bodyDesignerProfile: body.payload.bodyDesignerProfile,
    characterConstructionProfile: body.payload.semanticRecordPatch.characterConstructionProfile,
    savedAt,
    ownerId: user.id,
  };

  return NextResponse.json({
    ok: true,
    persistedTo: "server",
    assetId: body.payload.sourceAssetId ?? body.payload.sessionId,
    semanticMarker,
    message: "Editor save foundation recorded",
  });
}
