import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import {
  archiveEditorCanvasProject,
  deleteEditorCanvasProject,
  getEditorCanvasProject,
  restoreEditorCanvasProject,
  upsertEditorCanvasProject,
} from "@/server/editor/editor-canvas-project-service";
import { parseEditorCanvasProjectPayload } from "@/lib/editor-project-payload";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const user = await requireActiveUser();
    if (user instanceof NextResponse) {
      return user;
    }
    const { id } = await context.params;
    const row = await getEditorCanvasProject(user.id, id);
    if (!row) {
      return NextResponse.json({ ok: false, error: "Project not found." }, { status: 404 });
    }
    const project = parseEditorCanvasProjectPayload(row.payload);
    return NextResponse.json({
      ok: true,
      project,
      updatedAt: row.updatedAt.toISOString(),
      status: row.status,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Could not load project." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const user = await requireActiveUser();
    if (user instanceof NextResponse) {
      return user;
    }
    const { id } = await context.params;
    const body = (await request.json().catch(() => null)) as {
      payload?: unknown;
      name?: string;
    } | null;
    const payload = parseEditorCanvasProjectPayload(body?.payload);
    if (!payload || payload.sessionId !== id) {
      return NextResponse.json({ ok: false, error: "Invalid project payload." }, { status: 400 });
    }
    const row = await upsertEditorCanvasProject(user.id, id, {
      payload,
      name: body?.name,
    });
    return NextResponse.json({
      ok: true,
      project: parseEditorCanvasProjectPayload(row.payload),
      updatedAt: row.updatedAt.toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Could not save project." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = await requireActiveUser();
    if (user instanceof NextResponse) {
      return user;
    }
    const { id } = await context.params;
    const body = (await request.json().catch(() => null)) as { status?: string } | null;
    if (body?.status === "archived") {
      const count = await archiveEditorCanvasProject(user.id, id);
      if (count.count === 0) {
        return NextResponse.json({ ok: false, error: "Project not found." }, { status: 404 });
      }
      return NextResponse.json({ ok: true });
    }
    if (body?.status === "active") {
      const count = await restoreEditorCanvasProject(user.id, id);
      if (count.count === 0) {
        return NextResponse.json({ ok: false, error: "Project not found." }, { status: 404 });
      }
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ ok: false, error: "Invalid status." }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Could not update project." },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const user = await requireActiveUser();
    if (user instanceof NextResponse) {
      return user;
    }
    const { id } = await context.params;
    const result = await deleteEditorCanvasProject(user.id, id);
    if (result.count === 0) {
      return NextResponse.json({ ok: false, error: "Project not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Could not delete project." },
      { status: 500 }
    );
  }
}
