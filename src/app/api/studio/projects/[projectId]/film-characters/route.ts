import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { getCreativeProjectForOwner } from "@/server/studio-library/creative-project-service";
import { listOwnedFilmCharacters } from "@/server/studio/studio-film-preparation";

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
