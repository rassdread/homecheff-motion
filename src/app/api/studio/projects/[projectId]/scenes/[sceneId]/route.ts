import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { saveFilmSceneSubtitle, updateFilmScene } from "@/server/studio/studio-film-preparation";

type Ctx = { params: Promise<{ projectId: string; sceneId: string }> };

export async function PATCH(request: Request, context: Ctx) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) return user;
  const { projectId, sceneId } = await context.params;
  const body = (await request.json().catch(() => null)) as {
    title?: string;
    description?: string;
    action?: string;
    emotion?: string;
    characterIds?: unknown;
    subtitleText?: string;
    dialogueText?: string | null;
  } | null;
  if (!body) return NextResponse.json({ error: "Invalid JSON.", code: "validation" }, { status: 400 });
  const characterIds = Array.isArray(body.characterIds)
    ? body.characterIds.filter((id): id is string => typeof id === "string")
    : undefined;
  const scene = await updateFilmScene(user.id, projectId, sceneId, user, {
    title: body.title,
    description: body.description,
    action: body.action,
    emotion: body.emotion,
    characterIds,
    dialogueText: typeof body.dialogueText === "string" || body.dialogueText === null ? body.dialogueText : undefined,
  });
  if ("error" in scene) {
    return NextResponse.json({ error: scene.error.message, code: scene.error.code }, { status: scene.error.httpStatus });
  }
  if (typeof body.subtitleText === "string") {
    const subtitle = await saveFilmSceneSubtitle(user.id, projectId, sceneId, body.subtitleText);
    if ("error" in subtitle) {
      return NextResponse.json({ error: subtitle.error.message, code: subtitle.error.code }, { status: subtitle.error.httpStatus });
    }
  }
  return NextResponse.json({ sceneId: scene.scene.id });
}
