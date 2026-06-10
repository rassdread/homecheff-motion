import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import {
  createEditorCanvasProject,
  listEditorCanvasProjects,
} from "@/server/editor/editor-canvas-project-service";
import {
  editorProjectListItemFromPayload,
  parseEditorCanvasProjectPayload,
} from "@/lib/editor-project-payload";

export async function GET(request: Request) {
  try {
    const user = await requireActiveUser();
    if (user instanceof NextResponse) {
      return user;
    }
    const url = new URL(request.url);
    const status = url.searchParams.get("status") === "archived" ? "archived" : "active";
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") ?? 20)));
    const rows = await listEditorCanvasProjects(user.id, { status, limit });
    return NextResponse.json({
      ok: true,
      projects: rows.map((row) =>
        editorProjectListItemFromPayload(
          row.id,
          row.name,
          row.status,
          row.updatedAt,
          row.createdAt,
          row.payload
        )
      ),
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Could not list projects." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireActiveUser();
    if (user instanceof NextResponse) {
      return user;
    }
    const body = (await request.json().catch(() => null)) as { payload?: unknown } | null;
    const payload = parseEditorCanvasProjectPayload(body?.payload);
    if (!payload) {
      return NextResponse.json({ ok: false, error: "Invalid project payload." }, { status: 400 });
    }
    const row = await createEditorCanvasProject(user.id, {
      id: payload.sessionId,
      name: payload.name,
      payload,
    });
    return NextResponse.json({
      ok: true,
      project: parseEditorCanvasProjectPayload(row.payload),
      updatedAt: row.updatedAt.toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Could not create project." },
      { status: 500 }
    );
  }
}
