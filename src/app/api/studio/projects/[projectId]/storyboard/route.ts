import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { getCreativeProjectForOwner } from "@/server/studio-library/creative-project-service";
import {
  attachFilmStoryboard,
  createFilmStoryboard,
  listOwnedStoryboardOptions,
} from "@/server/studio/studio-film-preparation";

type Ctx = { params: Promise<{ projectId: string }> };

function jsonError(error: { message: string; code: string; httpStatus: number }) {
  return NextResponse.json({ error: error.message, code: error.code }, { status: error.httpStatus });
}

export async function GET(_request: Request, context: Ctx) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) return user;
  const { projectId } = await context.params;
  const project = await getCreativeProjectForOwner(projectId, user.id);
  if (!project) return NextResponse.json({ error: "Not found.", code: "not_found" }, { status: 404 });
  const options = await listOwnedStoryboardOptions(user.id);
  return NextResponse.json({ projectId, storyboards: options });
}

export async function POST(request: Request, context: Ctx) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) return user;
  const { projectId } = await context.params;
  const body = (await request.json().catch(() => null)) as { mode?: string; storyboardId?: string; confirmed?: boolean } | null;
  if (body?.mode === "attach") {
    const result = await attachFilmStoryboard({
      ownerId: user.id,
      projectId,
      storyboardId: typeof body.storyboardId === "string" ? body.storyboardId : "",
      confirmed: body.confirmed === true,
    });
    if ("error" in result) return jsonError(result.error);
    return NextResponse.json(result);
  }
  const result = await createFilmStoryboard(user.id, projectId);
  if ("error" in result) return jsonError(result.error);
  return NextResponse.json(result);
}
