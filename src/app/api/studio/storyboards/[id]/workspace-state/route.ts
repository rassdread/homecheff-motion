import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { getStudioStoryboardById } from "@/server/studio/studio-storyboard-service";
import {
  patchStudioWorkspaceState,
  readStudioWorkspaceState,
} from "@/server/studio/studio-workspace-state-blob";
import type { StudioWorkspaceStatePatch } from "@/types/studio-workspace-state";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const { id } = await context.params;
  const storyboard = await getStudioStoryboardById(id, user);
  if (!storyboard) {
    return NextResponse.json({ error: "Not found.", code: "NOT_FOUND" }, { status: 404 });
  }

  const state = await readStudioWorkspaceState({
    ownerId: storyboard.ownerId,
    storyboardId: id,
  });
  return NextResponse.json({ ok: true, state }, { status: 200 });
}

export async function PUT(request: Request, context: RouteContext) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const { id } = await context.params;
  const storyboard = await getStudioStoryboardById(id, user);
  if (!storyboard) {
    return NextResponse.json({ error: "Not found.", code: "NOT_FOUND" }, { status: 404 });
  }

  let body: StudioWorkspaceStatePatch;
  try {
    body = (await request.json()) as StudioWorkspaceStatePatch;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body.", code: "INVALID_BODY" }, { status: 400 });
  }

  const state = await patchStudioWorkspaceState({
    ownerId: storyboard.ownerId,
    storyboardId: id,
    patch: body,
  });
  return NextResponse.json({ ok: true, state }, { status: 200 });
}
