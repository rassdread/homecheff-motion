import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { saveFilmNarrator } from "@/server/studio/studio-film-preparation";

type Ctx = { params: Promise<{ projectId: string }> };

export async function PATCH(request: Request, context: Ctx) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) return user;
  const { projectId } = await context.params;
  const body = (await request.json().catch(() => null)) as { text?: string } | null;
  const result = await saveFilmNarrator(user.id, projectId, user, typeof body?.text === "string" ? body.text : "");
  if ("error" in result) {
    return NextResponse.json({ error: result.error.message, code: result.error.code }, { status: result.error.httpStatus });
  }
  return NextResponse.json({ ok: true });
}
