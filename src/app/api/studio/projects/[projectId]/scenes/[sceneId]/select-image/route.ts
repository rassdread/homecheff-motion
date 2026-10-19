import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { selectFilmSceneImage } from "@/server/studio/studio-film-preparation";

type Ctx = { params: Promise<{ projectId: string; sceneId: string }> };

export async function POST(request: Request, context: Ctx) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) return user;
  const { projectId, sceneId } = await context.params;
  const body = (await request.json().catch(() => null)) as { imageId?: string } | null;
  const result = await selectFilmSceneImage(user.id, projectId, sceneId, body?.imageId ?? "", user);
  if ("error" in result) {
    return NextResponse.json({ error: result.error.message, code: result.error.code }, { status: result.error.httpStatus });
  }
  return NextResponse.json({ ok: true });
}
