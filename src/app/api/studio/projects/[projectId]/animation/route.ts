import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { getCreativeProjectForOwner } from "@/server/studio-library/creative-project-service";
import { attachFilmAnimation, listOwnedAnimationOptions } from "@/server/studio/studio-film-preparation";

type Ctx = { params: Promise<{ projectId: string }> };

export async function GET(_request: Request, context: Ctx) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) return user;
  const { projectId } = await context.params;
  const project = await getCreativeProjectForOwner(projectId, user.id);
  if (!project) return NextResponse.json({ error: "Not found.", code: "not_found" }, { status: 404 });
  return NextResponse.json({ animations: await listOwnedAnimationOptions(user.id) });
}

export async function POST(request: Request, context: Ctx) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) return user;
  const { projectId } = await context.params;
  const body = (await request.json().catch(() => null)) as { animationProjectId?: string; confirmed?: boolean } | null;
  const result = await attachFilmAnimation({
    ownerId: user.id,
    projectId,
    animationProjectId: body?.animationProjectId ?? "",
    confirmed: body?.confirmed === true,
  });
  if ("error" in result) {
    return NextResponse.json({ error: result.error.message, code: result.error.code }, { status: result.error.httpStatus });
  }
  return NextResponse.json(result);
}
