import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { getAnimationProjectByIdForViewer } from "@/server/animation-projects/queries";
import { isInstantLikeProject } from "@/server/instant-premium/instant-project-utils";
import {
  deleteFullRerenderDraft,
  ensureFullRerenderDraftForProject,
  getFullRerenderDraftForProject,
  upsertFullRerenderDraft,
} from "@/server/instant-premium/full-rerender-draft-service";
import { parseFullRerenderDraftPayload } from "@/lib/full-rerender-draft";
import { prisma } from "@/lib/prisma";

export const maxDuration = 30;

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function loadOwnedInstantProject(
  projectId: string,
  viewer: { id: string; role: string }
) {
  const project = await getAnimationProjectByIdForViewer(projectId, viewer);
  if (!project) {
    return { error: "Project not found.", status: 404 as const };
  }
  if (!isInstantLikeProject(project)) {
    return { error: "Full rerender is only available for instant premium projects.", status: 409 as const };
  }
  return { project };
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const loaded = await loadOwnedInstantProject(id, user);
  if ("error" in loaded) {
    return NextResponse.json({ error: loaded.error }, { status: loaded.status });
  }

  const draft = await getFullRerenderDraftForProject(id);
  const row = await prisma.projectFullRerenderDraft.findUnique({ where: { projectId: id } });

  return NextResponse.json({
    draft,
    updatedAt: row?.updatedAt.toISOString() ?? null,
  });
}

export async function PUT(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const loaded = await loadOwnedInstantProject(id, user);
  if ("error" in loaded) {
    return NextResponse.json({ error: loaded.error }, { status: loaded.status });
  }

  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const payload = parseFullRerenderDraftPayload(
    body && typeof body === "object" && "payload" in (body as object)
      ? (body as { payload: unknown }).payload
      : body
  );
  if (!payload) {
    return NextResponse.json({ error: "Invalid draft payload." }, { status: 400 });
  }

  const result = await upsertFullRerenderDraft(id, payload);
  return NextResponse.json({ ok: true, updatedAt: result.updatedAt });
}

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const loaded = await loadOwnedInstantProject(id, user);
  if ("error" in loaded) {
    return NextResponse.json({ error: loaded.error }, { status: loaded.status });
  }

  const draft = await ensureFullRerenderDraftForProject(loaded.project);
  const row = await prisma.projectFullRerenderDraft.findUnique({ where: { projectId: id } });

  return NextResponse.json({
    draft,
    updatedAt: row?.updatedAt.toISOString() ?? null,
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const loaded = await loadOwnedInstantProject(id, user);
  if ("error" in loaded) {
    return NextResponse.json({ error: loaded.error }, { status: loaded.status });
  }

  await deleteFullRerenderDraft(id);
  return NextResponse.json({ ok: true });
}
