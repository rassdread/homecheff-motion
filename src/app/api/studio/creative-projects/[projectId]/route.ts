import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import {
  archiveCreativeProject,
  getCreativeProjectForOwner,
  updateCreativeProject,
} from "@/server/studio-library/creative-project-service";
import { serializeCreativeProject } from "@/server/studio-library/serialize";
import type { StudioCreativeProjectStatus } from "@/lib/studio-library-types";

type Ctx = { params: Promise<{ projectId: string }> };

export async function GET(_request: Request, context: Ctx) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) return user;
  const { projectId } = await context.params;
  const row = await getCreativeProjectForOwner(projectId, user.id);
  if (!row) {
    return NextResponse.json({ error: "Not found.", code: "not_found" }, { status: 404 });
  }
  await updateCreativeProject({ projectId, ownerId: user.id, touchOpened: true });
  return NextResponse.json({ project: serializeCreativeProject(row) });
}

export async function PATCH(request: Request, context: Ctx) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) return user;
  const { projectId } = await context.params;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON.", code: "validation" }, { status: 400 });
  }

  const row = await updateCreativeProject({
    projectId,
    ownerId: user.id,
    title: typeof body.title === "string" ? body.title : undefined,
    description: typeof body.description === "string" ? body.description : undefined,
    status: typeof body.status === "string" ? (body.status as StudioCreativeProjectStatus) : undefined,
    pinned: typeof body.pinned === "boolean" ? body.pinned : undefined,
    favorite: typeof body.favorite === "boolean" ? body.favorite : undefined,
    coverAssetId: typeof body.coverAssetId === "string" ? body.coverAssetId : undefined,
    touchOpened: body.touchOpened === true,
  });
  if (!row) {
    return NextResponse.json({ error: "Not found.", code: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ project: serializeCreativeProject(row) });
}

export async function DELETE(_request: Request, context: Ctx) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) return user;
  const { projectId } = await context.params;
  const row = await archiveCreativeProject(projectId, user.id);
  if (!row) {
    return NextResponse.json({ error: "Not found.", code: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ project: serializeCreativeProject(row), archived: true });
}
