import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { forkEditorCanvasProject } from "@/server/editor/editor-canvas-project-service";
import { parseEditorCanvasProjectPayload } from "@/lib/editor-project-payload";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const user = await requireActiveUser();
    if (user instanceof NextResponse) {
      return user;
    }
    const { id } = await context.params;
    const body = (await request.json().catch(() => null)) as { newId?: string } | null;
    const newId = body?.newId?.trim();
    if (!newId) {
      return NextResponse.json({ ok: false, error: "newId is required." }, { status: 400 });
    }
    const row = await forkEditorCanvasProject(user.id, id, newId);
    if (!row) {
      return NextResponse.json({ ok: false, error: "Source project not found." }, { status: 404 });
    }
    return NextResponse.json({
      ok: true,
      project: parseEditorCanvasProjectPayload(row.payload),
      updatedAt: row.updatedAt.toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Could not duplicate project." },
      { status: 500 }
    );
  }
}
