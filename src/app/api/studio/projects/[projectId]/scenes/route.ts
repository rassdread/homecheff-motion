import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { createFilmScene } from "@/server/studio/studio-film-preparation";

type Ctx = { params: Promise<{ projectId: string }> };

export async function POST(request: Request, context: Ctx) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) return user;
  const { projectId } = await context.params;
  const body = (await request.json().catch(() => ({}))) as { title?: string };
  const result = await createFilmScene(user.id, projectId, user, typeof body.title === "string" ? body.title : "");
  if ("error" in result) {
    return NextResponse.json({ error: result.error.message, code: result.error.code }, { status: result.error.httpStatus });
  }
  return NextResponse.json({ sceneId: result.scene.id });
}
