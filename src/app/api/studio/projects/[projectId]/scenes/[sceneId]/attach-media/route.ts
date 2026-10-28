import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { attachOwnedMediaToFilmScene } from "@/server/studio/studio-film-preparation";

type Ctx = { params: Promise<{ projectId: string; sceneId: string }> };

export async function POST(request: Request, context: Ctx) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) return user;
  const { projectId, sceneId } = await context.params;
  const body = (await request.json().catch(() => null)) as {
    imageUrl?: string;
    libraryAssetId?: string;
    userAudioId?: string;
    audioKind?: string;
  } | null;
  const result = await attachOwnedMediaToFilmScene(user.id, projectId, sceneId, {
    imageUrl: body?.imageUrl,
    libraryAssetId: body?.libraryAssetId,
    userAudioId: body?.userAudioId,
    audioKind: body?.audioKind,
  });
  if ("error" in result) {
    return NextResponse.json({ error: result.error.message, code: result.error.code }, { status: result.error.httpStatus });
  }
  return NextResponse.json(result);
}
