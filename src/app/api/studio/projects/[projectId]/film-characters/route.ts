import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { getCreativeProjectForOwner } from "@/server/studio-library/creative-project-service";
import { attachOwnedCharacterToFilm, listOwnedFilmCharacters } from "@/server/studio/studio-film-preparation";

type Ctx = { params: Promise<{ projectId: string }> };

export async function GET(_request: Request, context: Ctx) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) return user;
  const { projectId } = await context.params;
  const project = await getCreativeProjectForOwner(projectId, user.id);
  if (!project) return NextResponse.json({ error: "Not found.", code: "not_found" }, { status: 404 });
  const characters = await listOwnedFilmCharacters(user.id, projectId);
  return NextResponse.json({ projectId, characters });
}

export async function POST(request: Request, context: Ctx) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) return user;
  const { projectId } = await context.params;
  const body = (await request.json().catch(() => null)) as { characterId?: unknown } | null;
  const characterId = typeof body?.characterId === "string" ? body.characterId : "";
  if (!characterId) {
    return NextResponse.json({ error: "Choose a character.", code: "validation" }, { status: 400 });
  }
  const result = await attachOwnedCharacterToFilm(user.id, projectId, characterId);
  if ("error" in result) {
    return NextResponse.json(
      { error: result.error.message, code: result.error.code },
      { status: result.error.httpStatus },
    );
  }
  return NextResponse.json({ projectId, character: result.character }, { status: 200 });
}
