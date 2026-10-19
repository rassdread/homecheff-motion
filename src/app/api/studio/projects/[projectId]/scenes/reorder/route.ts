import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { reorderFilmScenes } from "@/server/studio/studio-film-preparation";

type Ctx = { params: Promise<{ projectId: string }> };

export async function POST(request: Request, context: Ctx) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) return user;
  const { projectId } = await context.params;
  const body = (await request.json().catch(() => null)) as { sceneIds?: unknown } | null;
  const sceneIds = Array.isArray(body?.sceneIds) ? body.sceneIds.filter((id): id is string => typeof id === "string") : [];
  const result = await reorderFilmScenes(user.id, projectId, user, sceneIds);
  if ("error" in result) {
    return NextResponse.json({ error: result.error.message, code: result.error.code }, { status: result.error.httpStatus });
  }
  return NextResponse.json({ ok: true });
}
