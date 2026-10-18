import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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
  const assets = await prisma.studioLibraryAsset.findMany({
    where: { projectId, ownerId: user.id, status: { not: "deleted" } },
    orderBy: { title: "asc" },
    take: 40,
    select: {
      id: true,
      family: true,
      title: true,
      status: true,
      previewUrl: true,
      sourceKind: true,
      metadataJson: true,
    },
  });
  const resources = assets.map((asset) => {
    const metadata = asset.metadataJson as { characterId?: unknown } | null;
    const characterId = typeof metadata?.characterId === "string" ? metadata.characterId : "";
    return {
      id: asset.id,
      family: asset.family,
      title: asset.title,
      status: asset.status,
      previewUrl: asset.previewUrl,
      sourceKind: asset.sourceKind,
      characterId,
    };
  });
  return NextResponse.json({
    project: serializeCreativeProject(row),
    resources,
    storyboardHref: row.storyboardId ? `/studio/storyboards/${row.storyboardId}` : null,
  });
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
