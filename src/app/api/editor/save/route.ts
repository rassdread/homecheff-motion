import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { persistEditorSaveToLibrary } from "@/server/studio/editor-library-persist-service";
import type { EditorSavePayload } from "@/lib/editor-canvas-export";
import type { EditorSaveMode } from "@/lib/editor-library-persist";
import type { EditorSourceKind } from "@/types/homecheff-visual-editor";

type SaveBody = {
  mode: EditorSaveMode;
  payload: EditorSavePayload;
  sourceKind?: EditorSourceKind;
};

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

  const sourceKind = body.sourceKind ?? "upload";
  const result = await persistEditorSaveToLibrary({
    ownerId: user.id,
    viewer: user,
    mode: body.mode,
    payload: body.payload,
    sourceKind,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.httpStatus });
  }

  return NextResponse.json({
    ok: true,
    persistedTo: "server",
    assetId: result.assetId,
    entityKind: result.entityKind,
    libraryHref: result.libraryHref,
    name: result.name,
  });
}
